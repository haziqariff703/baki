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

import jsQR from 'jsqr';

/**
 * Parse standard EMVCo DuitNow QR payloads or payment URLs into structured transaction data.
 * Standard DuitNow QR: Tag 59 = Merchant Name, Tag 54 = Amount, Tag 53 = Currency (458 = MYR).
 */
export function parseDuitNowQrPayload(payload: string): ImportRowSchema | null {
  if (!payload || payload.length < 10) return null;

  let merchantName: string | null = null;
  let amountSen: number | null = null;

  // 1. Recursive / stream EMVCo TLV parser (Tag-Length-Value)
  function parseTlv(str: string) {
    let idx = 0;
    while (idx < str.length - 4) {
      const tag = str.slice(idx, idx + 2);
      const lenStr = str.slice(idx + 2, idx + 4);
      const len = parseInt(lenStr, 10);
      if (isNaN(len) || idx + 4 + len > str.length) {
        idx += 1;
        continue;
      }

      const val = str.slice(idx + 4, idx + 4 + len);
      if (tag === '59') {
        merchantName = sanitizeMerchantName(val);
      } else if (tag === '54') {
        amountSen = parseFlexibleAmount(val);
      } else if (['26', '27', '28', '62'].includes(tag)) {
        // Parse nested sub-templates (e.g. Merchant Account Info or Additional Data)
        parseTlv(val);
      }
      idx += 4 + len;
    }
  }

  parseTlv(payload);

  // 2. Regex fallback for non-standard EMVCo or nested tags
  if (!merchantName) {
    const tag59Match = /59(\d{2})([A-Za-z0-9\s\-_.@*&]{2,50})/i.exec(payload);
    if (tag59Match) {
      const expectedLen = parseInt(tag59Match[1], 10);
      const name = tag59Match[2].slice(0, expectedLen);
      if (name.trim().length >= 2) {
        merchantName = sanitizeMerchantName(name);
      }
    }
  }

  if (amountSen === null) {
    const tag54Match = /54(\d{2})(\d{1,6}(?:\.\d{1,2})?)/i.exec(payload);
    if (tag54Match) {
      const expectedLen = parseInt(tag54Match[1], 10);
      const amtStr = tag54Match[2].slice(0, expectedLen);
      amountSen = parseFlexibleAmount(amtStr);
    }
  }

  // 3. URL Query Params fallback (e.g. duitnow.my/pay?amt=15.90&to=Spotify)
  if (!merchantName || amountSen === null) {
    const amtMatch = /[?&](?:amt|amount|value|total)=(\d+(?:\.\d{1,2})?)/i.exec(payload);
    if (amtMatch) amountSen = parseFlexibleAmount(amtMatch[1]);

    const merMatch = /[?&](?:merchant|name|biller|receiver|to)=([^&]+)/i.exec(payload);
    if (merMatch) merchantName = sanitizeMerchantName(decodeURIComponent(merMatch[1]));
  }

  if (merchantName && amountSen !== null && amountSen > 0) {
    const canonical = canonicalMerchantName(merchantName) || merchantName;
    const validated = importRowSchema.safeParse({
      merchantName: canonical,
      amountSen,
      transactionDate: new Date().toISOString(),
    });
    if (validated.success) {
      return validated.data;
    }
  }

  return null;
}

/**
 * Preprocess image in browser memory using HTML5 Canvas:
 * 1. Automatically crops out phone status bars (battery/clock) and bottom action buttons on mobile screenshots.
 * 2. Scans for DuitNow QR codes with jsQR.
 * 3. Rescales to optimal OCR dimensions (max 1800px).
 * 4. Converts to Grayscale and inverts dark theme screenshots for maximum Tesseract OCR clarity.
 */
async function preprocessImageForOcr(
  imageSource: File | Blob,
): Promise<{
  readonly processedBlob: Blob | File;
  readonly detectedQrRow: ImportRowSchema | null;
}> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return { processedBlob: imageSource, detectedQrRow: null }; // Server-side fallback
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
      return { processedBlob: imageSource, detectedQrRow: null };
    }

    const origWidth = img.width;
    const origHeight = img.height;

    // Detect if this is a tall mobile screenshot (aspect ratio > 1.6)
    const isMobileScreenshot = origHeight / origWidth > 1.6;

    // Smart Crop: Skip top 6% (status bar / clock / battery) and bottom 8% (action buttons) on tall screenshots
    const cropTop = isMobileScreenshot ? Math.round(origHeight * 0.06) : 0;
    const cropBottom = isMobileScreenshot ? Math.round(origHeight * 0.08) : 0;
    const croppedHeight = origHeight - cropTop - cropBottom;

    const MAX_DIM = 1800;
    let targetWidth = origWidth;
    let targetHeight = croppedHeight;

    if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * MAX_DIM) / targetWidth);
        targetWidth = MAX_DIM;
      } else {
        targetWidth = Math.round((targetWidth * MAX_DIM) / targetHeight);
        targetHeight = MAX_DIM;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.drawImage(
      img,
      0,
      cropTop,
      origWidth,
      croppedHeight,
      0,
      0,
      targetWidth,
      targetHeight,
    );
    URL.revokeObjectURL(url);

    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    // Step 1: Scan for DuitNow QR code payload with jsQR
    let detectedQrRow: ImportRowSchema | null = null;
    try {
      const qrCode = jsQR(imgData.data, targetWidth, targetHeight);
      if (qrCode && qrCode.data) {
        detectedQrRow = parseDuitNowQrPayload(qrCode.data);
      }
    } catch {
      // jsQR scan non-blocking fallback
    }

    const data = imgData.data;
    let totalGray = 0;
    const pixelCount = targetWidth * targetHeight;

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

    return {
      processedBlob: processedBlob || imageSource,
      detectedQrRow,
    };
  } catch {
    return { processedBlob: imageSource, detectedQrRow: null };
  }
}

/**
 * In-browser Image OCR recognizer using jsQR and Tesseract.js.
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
    const preprocessed = await preprocessImageForOcr(imageFile);
    targetInput = preprocessed.processedBlob;

    // If DuitNow QR code with transaction details was decoded directly, return it immediately
    if (preprocessed.detectedQrRow) {
      return {
        text: `DuitNow QR: ${preprocessed.detectedQrRow.merchantName} RM ${(preprocessed.detectedQrRow.amountSen / 100).toFixed(2)}`,
        rows: [preprocessed.detectedQrRow],
        rawLines: [
          `Merchant: ${preprocessed.detectedQrRow.merchantName}`,
          `Amount: RM ${(preprocessed.detectedQrRow.amountSen / 100).toFixed(2)}`,
          `Date: ${preprocessed.detectedQrRow.transactionDate.slice(0, 10)}`,
        ],
      };
    }
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
