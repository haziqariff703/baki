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
import { myrToSen } from '@/lib/money';
import { sanitizeMerchantName } from './sanitize';
import { canonicalMerchantName } from '@/features/subscriptions';

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
  merchantName: ['merchant', 'merchant name', 'description', 'name', 'payee', 'narrative'],
  amountSen: ['amount', 'rm', 'myr', 'value', 'amount (rm)', 'amount(myr)'],
  transactionDate: ['date', 'transaction date', 'txn date', 'transaction', 'posted date'],
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

function resolveField(header: string, canonical: keyof typeof HEADER_ALIASES): boolean {
  const normalized = normalizeHeader(header);
  return HEADER_ALIASES[canonical].includes(normalized);
}

/**
 * Convert a raw amount cell to integer sen. Accepts "15.90", "1590", "15.9".
 * Returns null if it is not a positive, well-formed MYR amount.
 */
function amountCellToSen(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const text = String(raw).trim();
  return myrToSen(text);
}

/**
 * Convert a raw date cell to an ISO 8601 UTC timestamp.
 *
 * Accepts common statement formats: "2026-07-01", "01/07/2026" (day/month/year),
 * "07/01/2026" is NOT auto-disambiguated — we require a recognised ISO or
 * unambiguous day-first format. Returns null if unrecognised.
 */
function dateCellToIso(raw: unknown): string | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const text = String(raw).trim();
  if (!text) return null;

  // ISO date (YYYY-MM-DD) — treat as UTC midnight.
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  // Day-first: DD/MM/YYYY or DD-MM-YYYY.
  const dmyMatch = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(text);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  }

  // Last resort: let Date.parse try; validate the result is a real date.
  const time = Date.parse(text);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

/**
 * Parse CSV text into validated import rows.
 *
 * Returns `{ rows, errors, truncated }`. Malformed rows are reported in
 * `errors` and never abort the whole parse. Input is treated as untrusted; all
 * merchant names are sanitised and every row re-validated by importRowSchema.
 */
export function parseCsv(text: string): CsvParseResult {
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: 'greedy',
  });

  if (parsed.errors.length > 0) {
    // Structural errors (quoting, delimiters) — fail the parse.
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

  const headerRow = data[0];
  // Find the canonical column index for each required field.
  const colIndex: { merchantName: number; amountSen: number; transactionDate: number } = {
    merchantName: headerRow.findIndex((h) => resolveField(h, 'merchantName')),
    amountSen: headerRow.findIndex((h) => resolveField(h, 'amountSen')),
    transactionDate: headerRow.findIndex((h) => resolveField(h, 'transactionDate')),
  };

  if (
    colIndex.merchantName < 0 ||
    colIndex.amountSen < 0 ||
    colIndex.transactionDate < 0
  ) {
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

  for (let i = 1; i < data.length; i += 1) {
    // `dataRow` is the 1-based physical line number (1 is the header row),
    // so the first data row is dataRow = 2.
    const dataRow = i + 1;

    // Enforce the row cap: skip rows beyond MAX_CSV_ROWS data rows.
    if (dataRow - 1 > MAX_CSV_ROWS) {
      truncated = true;
      break;
    }

    const line = data[i];

    // Empty trailing lines after greedy skip should not normally occur, but
    // guard against a fully empty row.
    if (!line || line.every((cell) => !String(cell).trim())) continue;

    const rawMerchant = line[colIndex.merchantName];
    const rawAmount = line[colIndex.amountSen];
    const rawDate = line[colIndex.transactionDate];

    // Sanitise (prompt-injection + length), then canonicalize to a brand key
    // so imported names resolve to logos deterministically (§2.1). Sanitise
    // first so the alias/normalization only ever sees clean, data-only text.
    const merchantName = canonicalMerchantName(
      sanitizeMerchantName(String(rawMerchant ?? '')),
    );
    const amountSen = amountCellToSen(rawAmount);
    const transactionDate = dateCellToIso(rawDate);

    // Clear, user-safe error message for invalid amounts (not a raw float).
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
