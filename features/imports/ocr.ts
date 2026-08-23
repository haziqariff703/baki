import { sanitizeMerchantName, sanitizeText } from './sanitize';
import { canonicalMerchantName } from '@/features/subscriptions';
import { importRowSchema, type ImportRowSchema } from '@/lib/validation';
import {
  parseFlexibleAmount,
  parseFlexibleDate,
  isBankHeaderOrNoise,
} from './bankStatementParser';
import { extractTransactionsFromText } from './pdfParser';
import jsQR from 'jsqr';

/**
 * Zero-Retention Memory Destruction Helper (AGENTS.md §2.3 / §12).
 *
 * Explicitly releases HTML5 Canvas buffers, Image elements, and Blob URLs
 * from browser RAM immediately after OCR or QR scanning concludes.
 */
export function purgeImageMemory(
  canvas?: HTMLCanvasElement | null,
  img?: HTMLImageElement | null,
  objectUrls?: readonly (string | null | undefined)[],
): void {
  if (canvas) {
    try {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      canvas.width = 0;
      canvas.height = 0;
    } catch {
      // Non-blocking cleanup
    }
  }

  if (img) {
    try {
      img.src = '';
      img.onload = null;
      img.onerror = null;
    } catch {
      // Non-blocking cleanup
    }
  }

  if (objectUrls) {
    for (const url of objectUrls) {
      if (url && typeof url === 'string' && url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Non-blocking cleanup
        }
      }
    }
  }
}

/**
 * Labels indicating a merchant or recipient name.
 */
const MERCHANT_LABEL_REGEX =
  /^(?:transfer\s*(?:to)?|recipient(?:\s*name)?|beneficiary(?:\s*name)?|paid\s*to|merchant(?:\s*name)?|biller(?:\s*name)?|bill\s*to|to|description|keterangan|penerima|nama\s*penerima|peniaga|bayar\s*kepada|kepada|transferred\s*to|payee)$/i;

const MERCHANT_INLINE_REGEX =
  /^(?:transfer\s*(?:to)?|recipient(?:\s*name)?|beneficiary(?:\s*name)?|paid\s*to|merchant(?:\s*name)?|biller(?:\s*name)?|bill\s*to|to|description|keterangan|penerima|nama\s*penerima|peniaga|bayar\s*kepada|kepada|transferred\s*to|payee)\s*[:\-]\s*(.+)$/i;

/**
 * Labels indicating an amount or total.
 */
const AMOUNT_LABEL_REGEX =
  /^(?:amount|transfer\s*amount|total|jumlah|jumlah\s*bayaran|amaun|total\s*amount|grand\s*total|subtotal|net\s*amount)$/i;

const AMOUNT_INLINE_REGEX =
  /^(?:amount|transfer\s*amount|total|jumlah|jumlah\s*bayaran|amaun|total\s*amount|grand\s*total|subtotal|net\s*amount)\s*[:\-]\s*(.+)$/i;

/**
 * Labels indicating a transaction date or timestamp.
 */
const DATE_LABEL_REGEX =
  /^(?:date|tarikh|transaction\s*date|tarikh\s*transaksi|date\s*&\s*time|tarikh\s*&\s*masa|payment\s*date|tarikh\s*bayaran)$/i;

const DATE_INLINE_REGEX =
  /^(?:date|tarikh|transaction\s*date|tarikh\s*transaksi|date\s*&\s*time|tarikh\s*&\s*masa|payment\s*date|tarikh\s*bayaran)\s*[:\-]\s*(.+)$/i;

const INCOMING_RECEIPT_REGEX =
  /\b(?:transfer\s+from|transferred\s+from|duitnow[_\s]+recei(?:v\w*)?|received\s+from)\b/i;

const STATEMENT_LAYOUT_REGEX = /\b(?:transaction\s+history|account\s+transactions|statement)\b/i;
const STATEMENT_DATE_REGEX =
  /\b(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b/g;
const DEBIT_SIGN_REGEX = /(?:\d[\d,]*\.\d{2}\s*[-–]|\b(?:DR|DEBIT)\b)/i;
const CREDIT_SIGN_REGEX = /(?:\d[\d,]*\.\d{2}\s*\+|\bCR\b)/i;

function normalizeOcrAmountText(line: string): string {
  const amountNormalized = line.replace(
    /\b(MYR|RM)\s*([0-9OIl|]+(?:[.,][0-9OIl|]{1,2})?)/gi,
    (_match, currency: string, value: string) =>
      `${currency} ${value.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(',', '.')}`,
  );

  return amountNormalized.replace(
    /\b([SOIl|])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/gi,
    (_match, digit: string, month: string) =>
      `${digit.toLowerCase() === 's' ? '5' : digit.toLowerCase() === 'o' ? '0' : '1'} ${month}`,
  );
}

function isIncomingTransactionText(text: string): boolean {
  if (DEBIT_SIGN_REGEX.test(text)) return false;
  if (CREDIT_SIGN_REGEX.test(text)) return true;
  return INCOMING_RECEIPT_REGEX.test(text);
}

function extractOcrStatementRows(rawText: string): readonly ImportRowSchema[] | null {
  const headerMatch = STATEMENT_LAYOUT_REGEX.exec(rawText);
  const statementText = headerMatch ? rawText.slice(headerMatch.index) : rawText;
  const dateMatches = [...statementText.matchAll(STATEMENT_DATE_REGEX)];

  if (!headerMatch && dateMatches.length < 2) return null;

  const rows: ImportRowSchema[] = [];
  for (let index = 0; index < dateMatches.length; index += 1) {
    const start = dateMatches[index].index ?? 0;
    const end = dateMatches[index + 1]?.index ?? statementText.length;
    const block = statementText.slice(start, end);
    if (isIncomingTransactionText(block)) continue;
    rows.push(...extractTransactionsFromText(block));
  }

  return rows;
}

function reconstructTsvText(tsv: string | null | undefined): string {
  if (!tsv) return '';

  const words = tsv
    .split(/\r?\n/)
    .slice(1)
    .map((row) => row.split('\t'))
    .filter((columns) => columns.length >= 12 && columns[0] === '5')
    .map((columns) => ({
      x: Number(columns[6]),
      y: Number(columns[7]) + Number(columns[9]) / 2,
      height: Number(columns[9]),
      text: columns.slice(11).join('\t').trim(),
    }))
    .filter(
      (word) =>
        word.text.length > 0 &&
        Number.isFinite(word.x) &&
        Number.isFinite(word.y) &&
        Number.isFinite(word.height),
    )
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const lines: { y: number; height: number; words: typeof words }[] = [];
  for (const word of words) {
    const line = lines.at(-1);
    const tolerance = line ? Math.max(8, Math.min(line.height, word.height) * 0.6) : 0;
    if (line && Math.abs(line.y - word.y) <= tolerance) {
      line.words.push(word);
      line.y = (line.y + word.y) / 2;
      line.height = Math.max(line.height, word.height);
    } else {
      lines.push({ y: word.y, height: word.height, words: [word] });
    }
  }

  return lines
    .map((line) =>
      line.words
        .sort((a, b) => a.x - b.x)
        .map((word) => word.text)
        .join(' '),
    )
    .join('\n');
}

/**
 * Deterministic Receipt & Mobile Bank Slip OCR Text Parser (§12 Privacy / §2.1 Deterministic).
 *
 * Extracts merchant names, dates (ISO / DD-MM-YYYY / 20 Aug 2026 / 12-hr AM/PM), and currency amounts (MYR)
 * from unstructured receipt and screenshot text (Touch 'n Go, MAE, DuitNow, CIMB OCTO, Bank Islam, RHB, etc.).
 * Supports both inline key-value pairs (e.g. `Transfer To: Spotify`) and multi-line layouts (Label on line i, Value on line i+1).
 */
export function parseReceiptLines(rawText: string): {
  readonly rows: readonly ImportRowSchema[];
  readonly rawLines: readonly string[];
} {
  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const statementRows = extractOcrStatementRows(rawText);
  if (statementRows) {
    return { rows: statementRows, rawLines };
  }

  // A standalone incoming transfer is not a subscription expense.
  if (isIncomingTransactionText(rawText)) {
    return { rows: [], rawLines };
  }

  const rows: ImportRowSchema[] = [];

  let candidateDate: string | null = null;
  let candidateMerchant: string | null = null;
  let candidateAmountSen: number | null = null;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const rawLine = rawLines[idx];
    const sanitizedLine = normalizeOcrAmountText(sanitizeText(rawLine));
    const nextLine =
      idx + 1 < rawLines.length
        ? normalizeOcrAmountText(sanitizeText(rawLines[idx + 1]))
        : null;

    // 1. Check for merchant name (Inline format: "Recipient: Spotify" or Multi-line: "Recipient" -> "Spotify")
    const merchantInlineMatch = MERCHANT_INLINE_REGEX.exec(sanitizedLine);
    if (merchantInlineMatch && merchantInlineMatch[1].trim().length >= 2) {
      const extracted = sanitizeMerchantName(merchantInlineMatch[1]);
      if (extracted && extracted.length >= 2) {
        candidateMerchant = extracted;
      }
    } else if (MERCHANT_LABEL_REGEX.test(sanitizedLine) && nextLine && nextLine.length >= 2) {
      if (!isBankHeaderOrNoise(nextLine) && !parseFlexibleDate(nextLine) && parseFlexibleAmount(nextLine) === null) {
        const extracted = sanitizeMerchantName(nextLine);
        if (extracted && extracted.length >= 2) {
          candidateMerchant = extracted;
          idx++; // Skip next line as we consumed it
          continue;
        }
      }
    }

    // 2. Check for amount (Inline: "Amount: RM 15.90" or Multi-line: "Amount" -> "RM 15.90" or direct amount)
    const amountInlineMatch = AMOUNT_INLINE_REGEX.exec(sanitizedLine);
    if (amountInlineMatch) {
      const amt = parseFlexibleAmount(amountInlineMatch[1]);
      if (amt !== null && amt > 0 && candidateAmountSen === null) {
        candidateAmountSen = amt;
      }
    } else if (AMOUNT_LABEL_REGEX.test(sanitizedLine) && nextLine) {
      const amt = parseFlexibleAmount(nextLine);
      if (amt !== null && amt > 0 && candidateAmountSen === null) {
        candidateAmountSen = amt;
        idx++; // Skip next line as we consumed it
        continue;
      }
    } else {
      const amtCandidate = parseFlexibleAmount(sanitizedLine);
      if (amtCandidate !== null && candidateAmountSen === null && amtCandidate > 0) {
        candidateAmountSen = amtCandidate;
      }
    }

    // 3. Check for date (Inline: "Date: 20/08/2026" or Multi-line: "Date" -> "20/08/2026" or direct date)
    const dateInlineMatch = DATE_INLINE_REGEX.exec(sanitizedLine);
    if (dateInlineMatch) {
      const dt = parseFlexibleDate(dateInlineMatch[1]);
      if (dt && !candidateDate) {
        candidateDate = dt;
      }
    } else if (DATE_LABEL_REGEX.test(sanitizedLine) && nextLine) {
      const dt = parseFlexibleDate(nextLine);
      if (dt && !candidateDate) {
        candidateDate = dt;
        idx++; // Skip next line as we consumed it
        continue;
      }
    } else {
      const dateCandidate = parseFlexibleDate(sanitizedLine);
      if (dateCandidate && !candidateDate) {
        candidateDate = dateCandidate;
      }
    }

    // 4. Fallback merchant extraction if not found via label
    if (!candidateMerchant && sanitizedLine.length >= 3 && !isBankHeaderOrNoise(sanitizedLine)) {
      const lower = sanitizedLine.toLowerCase();
      const isNoise =
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
        lower.includes("touch 'n go") ||
        lower.includes('touch n go') ||
        lower.includes('maybank2u') ||
        lower.includes('cimb clicks') ||
        lower.includes('bank islam') ||
        lower.includes('public bank') ||
        lower.includes('duitnow transfer') ||
        lower.includes('instant transfer');

      if (
        !isNoise &&
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

  // Fallback: If line-by-line found 0 rows, run continuous text stream segmenter
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
 * Parse standard EMVCo DuitNow QR payloads or payment URLs into structured transaction data.
 * Standard DuitNow QR: Tag 59 = Merchant Name, Tag 54 = Amount, Tag 53 = Currency (458 = MYR).
 */
export function parseDuitNowQrPayload(payload: string): ImportRowSchema | null {
  if (!payload || payload.length < 10) return null;

  let merchantName: string | null = null;
  let amountSen: number | null = null;

  // 1. Recursive EMVCo TLV parser (Tag-Length-Value)
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
        parseTlv(val);
      }
      idx += 4 + len;
    }
  }

  parseTlv(payload);

  // 2. Regex fallback for non-standard EMVCo tags
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
 * 1. Scans for embedded DuitNow QR codes with jsQR.
 * 2. Rescales safely to optimal OCR resolution (max 2000px).
 * 3. Applies non-destructive contrast stretching and dark mode inversion without clipping font anti-aliasing.
 * 4. Strictly purges memory on completion or error (AGENTS.md §2.3 / §12).
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

  let canvas: HTMLCanvasElement | null = null;
  let img: HTMLImageElement | null = null;
  let objectUrl: string | null = null;

  try {
    img = new Image();
    objectUrl = URL.createObjectURL(imageSource);

    await new Promise<void>((resolve, reject) => {
      if (!img) return reject(new Error('Image element null'));
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for canvas preprocessing'));
      img.src = objectUrl!;
    });

    canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      purgeImageMemory(canvas, img, [objectUrl]);
      return { processedBlob: imageSource, detectedQrRow: null };
    }

    const origWidth = img.width;
    const origHeight = img.height;

    // Bring small screenshots up to OCR resolution and cap large camera images.
    const TARGET_LONG_DIM = 2000;
    const MAX_DIM = 2400;
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    const longestSide = Math.max(origWidth, origHeight);
    if (longestSide > 0 && longestSide !== TARGET_LONG_DIM) {
      const targetLongestSide = Math.min(MAX_DIM, Math.max(TARGET_LONG_DIM, longestSide));
      const scale = targetLongestSide / longestSide;
      targetWidth = Math.max(1, Math.round(origWidth * scale));
      targetHeight = Math.max(1, Math.round(origHeight * scale));
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, origWidth, origHeight, 0, 0, targetWidth, targetHeight);

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

    // Pass 1: Compute average brightness
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      totalGray += gray;
    }

    const avgBrightness = totalGray / pixelCount;
    const isDarkTheme = avgBrightness < 110; // Dark mode screenshots (MAE, TnG dark theme)

    // Pass 2: Gentle contrast stretching without destructive hard clipping
    const minVal = Math.max(0, avgBrightness - 85);
    const maxVal = Math.min(255, avgBrightness + 85);
    const range = maxVal - minVal || 1;

    for (let i = 0; i < data.length; i += 4) {
      let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

      if (isDarkTheme) {
        gray = 255 - gray; // Invert dark mode so text becomes dark on light
      }

      // Smooth contrast normalization keeping font anti-aliasing intact
      let normalized = ((gray - minVal) / range) * 255;
      normalized = Math.max(0, Math.min(255, normalized));

      data[i] = normalized;
      data[i + 1] = normalized;
      data[i + 2] = normalized;
    }

    ctx.putImageData(imgData, 0, 0);

    const processedBlob = await new Promise<Blob | null>((resolve) => {
      canvas?.toBlob((b) => resolve(b), 'image/png');
    });

    return {
      processedBlob: processedBlob || imageSource,
      detectedQrRow,
    };
  } catch {
    return { processedBlob: imageSource, detectedQrRow: null };
  } finally {
    purgeImageMemory(canvas, img, [objectUrl]);
  }
}

/**
 * In-browser Image OCR recognizer with zero-retention memory guarantees.
 *
 * Runs client-side in a WebAssembly worker without uploading raw user images
 * to external cloud services (AGENTS.md §2.3 Privacy by Design / §12).
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

    // If DuitNow QR code with transaction details was decoded directly, return immediately
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

  const { createWorker, PSM } = await import('tesseract.js');
  let recognitionPass = 0;
  const worker = await createWorker('eng', 1, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract',
    langPath: '/tesseract',
    gzip: false,
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number' && onProgress) {
        onProgress(
          recognitionPass === 0
            ? Math.round(m.progress * 60)
            : 60 + Math.round(m.progress * 40),
        );
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });
    const primary = await worker.recognize(
      targetInput,
      { rotateAuto: true },
      { text: true, tsv: true },
    );

    const primaryTexts = [primary.data.text ?? '', reconstructTsvText(primary.data.tsv)];
    let best = primaryTexts
      .map((text) => ({ text, parsed: parseReceiptLines(text) }))
      .sort((a, b) => b.parsed.rows.length - a.parsed.rows.length)[0];
    let bestConfidence = primary.data.confidence ?? 0;

    if (best.parsed.rows.length === 0 && !isIncomingTransactionText(best.text)) {
      recognitionPass = 1;
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300',
      });
      const fallback = await worker.recognize(
        targetInput,
        { rotateAuto: true },
        { text: true, tsv: true },
      );
      const fallbackBest = [fallback.data.text ?? '', reconstructTsvText(fallback.data.tsv)]
        .map((text) => ({ text, parsed: parseReceiptLines(text) }))
        .sort((a, b) => b.parsed.rows.length - a.parsed.rows.length)[0];
      const fallbackConfidence = fallback.data.confidence ?? 0;

      if (
        fallbackBest.parsed.rows.length > best.parsed.rows.length ||
        (fallbackBest.parsed.rows.length === best.parsed.rows.length &&
          fallbackConfidence > bestConfidence)
      ) {
        best = fallbackBest;
        bestConfidence = fallbackConfidence;
      }
    }

    onProgress?.(100);

    return {
      text: best.text,
      rows: best.parsed.rows,
      rawLines: best.parsed.rawLines,
    };
  } finally {
    try {
      await worker.terminate();
    } catch {
      // Non-blocking
    }
  }
}
