import { sanitizeMerchantName, sanitizeText } from './sanitize';
import { canonicalMerchantName } from '@/features/subscriptions';
import { importRowSchema, type ImportRowSchema } from '@/lib/validation';
import {
  parseFlexibleAmount,
  parseFlexibleDate,
  isBankHeaderOrNoise,
} from './bankStatementParser';
import { extractTransactionsFromText } from './pdfParser';

/**
 * Deterministic Receipt & Invoice Text Line Parser (§12 Privacy / §2.1 Deterministic).
 *
 * Extracts merchant names, dates (ISO / DD-MM-YYYY / 20 Aug 2026 / 12-hr AM/PM), and currency amounts (MYR)
 * from unstructured receipt and transaction slip OCR text (Touch 'n Go, MAE, DuitNow, CIMB OCTO, Bank Islam, RHB, etc.).
 */
export function parseReceiptLines(rawText: string): {
  readonly rows: readonly ImportRowSchema[];
  readonly rawLines: readonly string[];
} {
  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: ImportRowSchema[] = [];

  let candidateDate: string | null = null;
  let candidateMerchant: string | null = null;
  let candidateAmountSen: number | null = null;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const sanitizedLine = sanitizeText(rawLine);

    // 1. Check for DuitNow / Malaysian Bank labeled merchant lines (MAE, CIMB, RHB, TnG, HLB)
    const transferToMatch =
      /^(?:transfer\s*(?:to)?|recipient(?:\s*name)?|beneficiary(?:\s*name)?|paid\s*to|merchant(?:\s*name)?|biller(?:\s*name)?|bill\s*to|to|description|keterangan|penerima)\s*[:\-]\s*(.+)$/i.exec(
        sanitizedLine,
      );
    if (transferToMatch && transferToMatch[1].trim().length >= 2) {
      const extracted = sanitizeMerchantName(transferToMatch[1]);
      if (extracted && extracted.length >= 2) {
        candidateMerchant = extracted;
      }
    }

    // 2. Check for date (flexible Malaysian format including 12h AM/PM)
    const dateCandidate = parseFlexibleDate(sanitizedLine);
    if (dateCandidate && !candidateDate) {
      candidateDate = dateCandidate;
    }

    // 3. Check for amount
    const amountCandidate = parseFlexibleAmount(sanitizedLine);
    if (amountCandidate !== null && candidateAmountSen === null && amountCandidate > 0) {
      candidateAmountSen = amountCandidate;
    }

    // 4. Check for merchant name fallback if not found via label
    if (!candidateMerchant && sanitizedLine.length >= 3 && !isBankHeaderOrNoise(sanitizedLine)) {
      const lower = sanitizedLine.toLowerCase();
      const isGeneric =
        lower.startsWith('date') ||
        lower.startsWith('tarikh') ||
        lower.startsWith('amount') ||
        lower.startsWith('jumlah') ||
        lower.startsWith('total') ||
        lower.startsWith('tax') ||
        lower.startsWith('sst') ||
        lower.startsWith('invoice') ||
        lower.startsWith('receipt') ||
        lower.startsWith('resit') ||
        lower.startsWith('status') ||
        lower.startsWith('reference') ||
        lower.startsWith('ref') ||
        lower.startsWith('rtrn') ||
        lower.startsWith('successful') ||
        lower.startsWith('berjaya') ||
        lower.startsWith('payment') ||
        lower.startsWith('card') ||
        lower.startsWith('order id') ||
        lower.startsWith('trans id') ||
        lower.includes('ewallet') ||
        lower.includes('touch \'n go') ||
        lower.includes('touch n go') ||
        lower.includes('maybank2u') ||
        lower.includes('cimb clicks') ||
        lower.includes('bank islam') ||
        lower.includes('public bank') ||
        lower.includes('duitnow transfer') ||
        lower.includes('instant transfer');

      if (
        !isGeneric &&
        !parseFlexibleDate(sanitizedLine) &&
        parseFlexibleAmount(sanitizedLine) === null
      ) {
        candidateMerchant = sanitizeMerchantName(sanitizedLine);
      }
    }

    // 5. If we have all 3 fields, commit a transaction row
    if (candidateMerchant && candidateAmountSen && candidateDate) {
      const canonical = canonicalMerchantName(candidateMerchant) || candidateMerchant;
      const candidateRow = {
        merchantName: canonical,
        amountSen: candidateAmountSen,
        transactionDate: candidateDate,
      };

      const validated = importRowSchema.safeParse(candidateRow);
      if (validated.success) {
        rows.push(validated.data);
      }

      candidateDate = null;
      candidateMerchant = null;
      candidateAmountSen = null;
    }
  }

  // End of loop check
  if (candidateMerchant && candidateAmountSen && candidateDate) {
    const canonical = canonicalMerchantName(candidateMerchant) || candidateMerchant;
    const candidateRow = {
      merchantName: canonical,
      amountSen: candidateAmountSen,
      transactionDate: candidateDate,
    };
    const validated = importRowSchema.safeParse(candidateRow);
    if (validated.success) {
      rows.push(validated.data);
    }
  }

  // If standard line-by-line found 0 rows, run continuous text stream segmenter as fallback
  if (rows.length === 0 && rawText.trim().length > 0) {
    const streamRows = extractTransactionsFromText(rawText);
    if (streamRows.length > 0) {
      return {
        rows: streamRows,
        rawLines,
      };
    }
  }

  return {
    rows,
    rawLines,
  };
}

/**
 * Preprocess image in browser memory using HTML5 Canvas:
 * 1. Rescales to optimal OCR dimensions (max 1800px).
 * 2. Converts to Grayscale.
 * 3. Dynamically inverts dark theme screenshots (black background -> white background).
 * 4. Stretches contrast so stylized bank app fonts become crisp for Tesseract WASM.
 */
async function preprocessImageForOcr(
  imageSource: File | Blob,
): Promise<Blob | File> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return imageSource; // Server-side fallback
  }

  try {
    const img = new Image();
    const url = URL.createObjectURL(imageSource);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for canvas preprocessing'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      URL.revokeObjectURL(url);
      return imageSource;
    }

    const MAX_DIM = 1800;
    let { width, height } = img;
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    let totalGray = 0;
    const pixelCount = width * height;

    // First pass: grayscale and calculate average background brightness
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalGray += gray;
    }

    const avgBrightness = totalGray / pixelCount;
    const isDarkTheme = avgBrightness < 120; // e.g. MAE dark mode or dark receipt

    // Second pass: grayscale + contrast stretch + inversion if dark mode
    for (let i = 0; i < data.length; i += 4) {
      let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      if (isDarkTheme) {
        gray = 255 - gray; // Invert dark mode so text becomes dark on light
      }

      // High contrast threshold stretch
      if (gray > 200) gray = 255;
      else if (gray < 70) gray = 0;

      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }

    ctx.putImageData(imgData, 0, 0);

    const processedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });

    return processedBlob || imageSource;
  } catch {
    return imageSource;
  }
}

/**
 * In-browser Image OCR recognizer using Tesseract.js.
 *
 * Runs client-side in a WebAssembly worker without uploading raw user images
 * to external cloud services (AGENTS.md §2.3 Privacy by Design).
 */
export async function recognizeReceiptImage(
  imageFile: File | Blob | string,
  onProgress?: (progress: number) => void,
): Promise<{
  readonly text: string;
  readonly rows: readonly ImportRowSchema[];
  readonly rawLines: readonly string[];
}> {
  let targetInput: File | Blob | string = imageFile;

  if (typeof imageFile !== 'string') {
    targetInput = await preprocessImageForOcr(imageFile);
  }

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const ret = await worker.recognize(targetInput);
    const text = ret.data.text ?? '';
    const parsed = parseReceiptLines(text);

    return {
      text,
      rows: parsed.rows,
      rawLines: parsed.rawLines,
    };
  } finally {
    await worker.terminate();
  }
}
