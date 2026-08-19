import { myrToSen } from '@/lib/money';
import { sanitizeMerchantName, sanitizeText } from './sanitize';
import { importRowSchema, type ImportRowSchema } from '@/lib/validation';

/**
 * Deterministic Receipt & Invoice Text Line Parser (§12 Privacy / §2.1 Deterministic).
 *
 * Extracts merchant names, dates (ISO / DD-MM-YYYY), and currency amounts (MYR)
 * from unstructured receipt and transaction slip OCR text.
 */
export function parseReceiptLines(rawText: string): {
  readonly rows: readonly ImportRowSchema[];
  readonly rawLines: readonly string[];
} {
  const rawLines = rawText
    .split(/\r?\n/)
    .map((l) => sanitizeMerchantName(l))
    .filter((l) => l.length > 0);

  const rows: ImportRowSchema[] = [];

  // Patterns for Malaysian dates: 2026-08-20, 20/08/2026, 20-08-2026
  const dateRegex = /\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/;
  // Patterns for amounts: RM 15.90, MYR 15.90, 15.90
  const amountRegex = /(?:RM|MYR)?\s*(\d+\.\d{2})\b/i;

  let candidateDate: string | null = null;
  let candidateMerchant: string | null = null;
  let candidateAmountSen: number | null = null;

  for (const line of rawLines) {
    // 1. Check for date
    const dateMatch = line.match(dateRegex);
    if (dateMatch && !candidateDate) {
      const rawDate = dateMatch[1].replace(/\//g, '-');
      if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
        candidateDate = rawDate;
      } else {
        const [d, m, y] = rawDate.split('-');
        candidateDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }

    // 2. Check for amount
    const amountMatch = line.match(amountRegex);
    if (amountMatch && candidateAmountSen === null) {
      const sen = myrToSen(amountMatch[1]);
      if (sen !== null && sen > 0) {
        candidateAmountSen = sen;
      }
    }

    // 3. Check for merchant name
    if (!candidateMerchant && line.length >= 3) {
      const lower = line.toLowerCase();
      const isGeneric =
        lower.startsWith('date') ||
        lower.startsWith('amount') ||
        lower.startsWith('total') ||
        lower.startsWith('tax') ||
        lower.startsWith('invoice') ||
        lower.startsWith('receipt') ||
        lower.startsWith('status') ||
        lower.startsWith('payment') ||
        lower.startsWith('card') ||
        lower.includes('ewallet') ||
        lower.includes('maybank2u') ||
        lower.includes('cimb clicks') ||
        lower.includes('bank islam') ||
        lower.includes('public bank');

      if (!isGeneric) {
        candidateMerchant = sanitizeMerchantName(line);
      }
    }

    // If we have all 3 fields, emit a row
    if (candidateMerchant && candidateAmountSen && candidateDate) {
      const candidateRow = {
        merchantName: candidateMerchant,
        amountSen: candidateAmountSen,
        transactionDate: `${candidateDate}T00:00:00.000Z`,
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

  // If at the end of loop we still have all 3 fields
  if (candidateMerchant && candidateAmountSen && candidateDate) {
    const candidateRow = {
      merchantName: candidateMerchant,
      amountSen: candidateAmountSen,
      transactionDate: `${candidateDate}T00:00:00.000Z`,
    };
    const validated = importRowSchema.safeParse(candidateRow);
    if (validated.success) {
      rows.push(validated.data);
    }
  }

  return {
    rows,
    rawLines,
  };
}
