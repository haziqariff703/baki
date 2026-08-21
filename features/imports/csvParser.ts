/**
 * Deterministic CSV statement parser.
 *
 * Papa Parse reads the (untrusted) CSV payload into rows, then every row is
 * validated through `importRowSchema` (AGENTS.md §7). Rows that fail validation
 * are surfaced in an `errors` bucket rather than throwing the whole parse, so a
 * single malformed row never aborts the import.
 *
 * Money is parsed as a decimal string and converted to integer sen via
 * `myrToSen` (§8.1) — no floating-point arithmetic for authoritative amounts.
 *
 * Raw content is process-local only and is NOT persisted here. See the
 * storage & purge note in features/imports/AGENTS.md: any caller that persists
 * the original file is responsible for deleting it after extraction.
 */
import Papa from 'papaparse';

import { importRowSchema, type ImportRowSchema } from '@/lib/validation';
import { sanitizeMerchantName } from './sanitize';
import { canonicalMerchantName } from '@/features/subscriptions';
import {
  parseFlexibleAmount,
  parseFlexibleDate,
} from './bankStatementParser';

/** Maximum number of data rows (excluding the header) to accept. */
export const MAX_CSV_ROWS = 1000;

/** A per-row parse failure. */
export interface CsvRowError {
  /** 1-based data-row number (row 1 is the first data row after the header). */
  readonly row: number;
  /** User-safe reason, no raw file content, no stack traces (§14). */
  readonly error: string;
}

/** Result of a CSV parse: valid rows plus per-row errors. */
export interface CsvParseResult {
  readonly rows: readonly ImportRowSchema[];
  readonly errors: readonly CsvRowError[];
  /** True if the CSV exceeded MAX_CSV_ROWS and trailing rows were skipped. */
  readonly truncated: boolean;
}

/**
 * Accepted header aliases. Keys are canonical field names; values are the
 * lowercase, whitespace-collapsed header names that map to them. Unknown
 * columns are ignored.
 */
const HEADER_ALIASES: Record<'merchantName' | 'amountSen' | 'transactionDate', readonly string[]> = {
  merchantName: [
    'merchant',
    'merchant name',
    'description',
    'name',
    'payee',
    'narrative',
    'merchant_name',
    'transaction description',
    'transaction details',
    'transaction narrative',
    'details',
    'item',
    'keterangan',
    'butiran',
    'maklumat transaksi',
    'transaksi',
  ],
  amountSen: [
    'amount',
    'rm',
    'myr',
    'value',
    'amount (rm)',
    'amount(rm)',
    'amount (myr)',
    'amount(myr)',
    'amount_myr',
    'amount_sen',
    'amount (sen)',
    'amount(sen)',
    'debit',
    'debit (myr)',
    'debit (rm)',
    'debit amount',
    'txn amount',
    'debit/credit',
    'debit / credit',
    'jumlah',
    'jumlah (rm)',
    'pengeluaran',
    'withdrawal',
  ],
  transactionDate: [
    'date',
    'transaction date',
    'txn date',
    'transaction',
    'posted date',
    'transaction_date',
    'date posted',
    'date_posted',
    'posting date',
    'post date',
    'entry date',
    'tarikh',
    'tarikh transaksi',
    'value date',
  ],
};

function normalizeHeader(header: string): string {
  return header
    .replace(/^\uFEFF/, '') // Strip UTF-8 Byte Order Mark (BOM)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function resolveField(header: string, canonical: keyof typeof HEADER_ALIASES): boolean {
  const normalized = normalizeHeader(header);
  return HEADER_ALIASES[canonical].includes(normalized);
}

/**
 * Convert a raw amount cell to integer sen using Malaysian bank format parser.
 */
function amountCellToSen(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  return parseFlexibleAmount(String(raw));
}

/**
 * Convert a raw date cell to an ISO 8601 UTC timestamp using flexible Malaysian date parser.
 */
function dateCellToIso(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  return parseFlexibleDate(String(raw));
}

/**
 * Parse CSV text into validated import rows.
 *
 * Scans preamble rows (supporting Maybank and CIMB CSV statement header formats),
 * converts amounts to integer sen, and validates every row with importRowSchema.
 */
export function parseCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
  });

  if (parsed.errors.length > 0) {
    return {
      rows: [],
      errors: parsed.errors.map((e) => ({
        row: typeof e.row === 'number' ? e.row + 1 : 1,
        error: `Malformed CSV: ${e.message}`,
      })),
      truncated: false,
    };
  }

  const data = parsed.data;
  if (data.length === 0) {
    return { rows: [], errors: [], truncated: false };
  }

  // Scan up to the first 15 rows to find the actual table header (handles bank statement preamble)
  let headerRowIndex = -1;
  let colIndex: { merchantName: number; amountSen: number; transactionDate: number } = {
    merchantName: -1,
    amountSen: -1,
    transactionDate: -1,
  };

  const scanLimit = Math.min(data.length, 15);
  for (let r = 0; r < scanLimit; r += 1) {
    const row = data[r];
    if (!Array.isArray(row)) continue;

    const mIdx = row.findIndex((h) => resolveField(h, 'merchantName'));
    const aIdx = row.findIndex((h) => resolveField(h, 'amountSen'));
    const dIdx = row.findIndex((h) => resolveField(h, 'transactionDate'));

    if (mIdx >= 0 && aIdx >= 0 && dIdx >= 0) {
      headerRowIndex = r;
      colIndex = { merchantName: mIdx, amountSen: aIdx, transactionDate: dIdx };
      break;
    }
  }

  if (headerRowIndex < 0) {
    return {
      rows: [],
      errors: [
        {
          row: 1,
          error:
            'Could not locate required columns (merchant, amount, date) in the header row',
        },
      ],
      truncated: false,
    };
  }

  const rows: ImportRowSchema[] = [];
  const errors: CsvRowError[] = [];
  let truncated = false;

  for (let i = headerRowIndex + 1; i < data.length; i += 1) {
    const dataRow = i + 1;

    // Enforce the row cap: skip rows beyond MAX_CSV_ROWS data rows.
    if (dataRow - headerRowIndex - 1 > MAX_CSV_ROWS) {
      truncated = true;
      break;
    }

    const line = data[i];
    if (!line || line.every((cell) => !String(cell).trim())) continue;

    const rawMerchant = line[colIndex.merchantName];
    const rawAmount = line[colIndex.amountSen];
    const rawDate = line[colIndex.transactionDate];

    const merchantName = canonicalMerchantName(
      sanitizeMerchantName(String(rawMerchant ?? '')),
    );
    const amountSen = amountCellToSen(rawAmount);
    const transactionDate = dateCellToIso(rawDate);

    if (amountSen === null) {
      errors.push({
        row: dataRow,
        error: 'Amount must be a positive value in sen (e.g. 15.90)',
      });
      continue;
    }

    const rowCandidate = {
      merchantName,
      amountSen,
      transactionDate: transactionDate ?? '',
    };

    const parsedRow = importRowSchema.safeParse(rowCandidate);
    if (parsedRow.success) {
      rows.push(parsedRow.data);
    } else {
      errors.push({
        row: dataRow,
        error: firstZodIssue(parsedRow.error),
      });
    }
  }

  return { rows, errors, truncated };
}

/** Extract the first, human-safe issue message from a ZodError. */
function firstZodIssue(error: { issues: readonly { message?: string }[] }): string {
  const first = error.issues[0];
  return first?.message ?? 'Row failed validation';
}
