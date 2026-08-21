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
 * Extracts merchant names, dates (ISO / DD-MM-YYYY / 20 Aug 2026), and currency amounts (MYR)
 * from unstructured receipt and transaction slip OCR text (Touch 'n Go, MAE, DuitNow, CIMB, etc.).
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

    // 1. Check for DuitNow / Receipt labeled merchant lines (e.g. "Transfer To: Netflix", "Recipient: Spotify")
    const transferToMatch = /^(?:transfer\s*to|recipient(?:\s*name)?|beneficiary(?:\s*name)?|paid\s*to|merchant(?:\s*name)?|bill(?:er)?\s*name|\bto\b|description)\s*[:\-]\s*(.+)$/i.exec(
      sanitizedLine,
    );
    if (transferToMatch && transferToMatch[1].trim().length >= 2) {
      const extracted = sanitizeMerchantName(transferToMatch[1]);
      if (extracted && extracted.length >= 2) {
        candidateMerchant = extracted;
      }
    }

    // 2. Check for date (flexible Malaysian format)
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
        lower.includes('ewallet') ||
        lower.includes('touch \'n go') ||
        lower.includes('touch n go') ||
        lower.includes('maybank2u') ||
        lower.includes('cimb clicks') ||
        lower.includes('bank islam') ||
        lower.includes('public bank') ||
        lower.includes('duitnow transfer') ||
        lower.includes('instant transfer');

      if (!isGeneric && !parseFlexibleDate(sanitizedLine) && parseFlexibleAmount(sanitizedLine) === null) {
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
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const ret = await worker.recognize(imageFile);
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
