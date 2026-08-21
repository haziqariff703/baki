/**
 * Deterministic bank statement parsing utilities for Malaysian financial formats.
 *
 * Handles Maybank, CIMB, Bank Islam, Public Bank, and standard bank statement layouts:
 * 1. Calendar-aware date extraction (2-digit years, Malay/English month names, DD/MM/YYYY).
 * 2. Amount extraction (trailing minuses, DR/CR markers, commas, parentheses).
 * 3. Non-transaction header/disclaimer filtering.
 *
 * Strict Sen integrity (AGENTS.md §8.1) & pure TypeScript determinism (AGENTS.md §2.1).
 */

import { myrToSen } from '@/lib/money';

/** Map of English & Malay month abbreviations to 0-indexed month integers. */
const MONTH_MAP: Readonly<Record<string, number>> = {
  jan: 0, january: 0, januari: 0,
  feb: 1, february: 1, februari: 1,
  mar: 2, march: 2, mac: 2,
  apr: 3, april: 3,
  may: 4, mei: 4,
  jun: 5, june: 5,
  jul: 6, july: 6, julai: 6,
  aug: 7, august: 7, ogo: 7, ogos: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, okt: 9, oktober: 9,
  nov: 10, november: 10,
  dec: 11, december: 11, dis: 11, disember: 11,
};

/**
 * Common bank statement non-transaction header/footer phrases to ignore.
 */
const BANK_IGNORE_PATTERNS: readonly RegExp[] = [
  /statement\s*of\s*account/i,
  /penyata\s*akaun/i,
  /malayan\s*banking/i,
  /maybank\s*(?:islamic|berhad|2u|mae)?/i,
  /cimb\s*(?:bank|islamic)?/i,
  /public\s*bank/i,
  /bank\s*islam/i,
  /rhb\s*bank/i,
  /hong\s*leong/i,
  /balance\s*brought\s*forward/i,
  /baki\s*dibawa\s*ke\s*hadapan/i,
  /beginning\s*balance/i,
  /ending\s*balance/i,
  /total\s*(?:debits?|credits?)/i,
  /jumlah\s*(?:debit|kredit)/i,
  /page\s*\d+\s*of\s*\d+/i,
  /muka\s*surat\s*\d+/i,
  /account\s*(?:number|no|details)/i,
  /nombor\s*akaun/i,
  /entry\s*date/i,
  /value\s*date/i,
  /transaction\s*(?:description|details|date)/i,
  /tarikh\s*(?:transaksi|masuk)/i,
  /cheque\s*no/i,
  /no\s*cek/i,
];

/**
 * Tests if a line is a bank statement header/metadata line rather than a transaction.
 */
export function isBankHeaderOrNoise(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3) return true;

  // If the line contains a valid amount and valid date, it's a real transaction, NOT a header!
  if (parseFlexibleAmount(trimmed) !== null && parseFlexibleDate(trimmed) !== null) {
    return false;
  }

  for (const pattern of BANK_IGNORE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

/**
 * Flexible date parser for Malaysian bank statements.
 *
 * Supports:
 * - `YYYY-MM-DD` / `YYYY/MM/DD` (e.g. 2026-08-01)
 * - `DD/MM/YYYY` / `DD-MM-YYYY` (e.g. 15/07/2026)
 * - `DD/MM/YY` / `DD-MM-YY` (e.g. 15/07/26 -> 2026-07-15)
 * - `DD MMM YYYY` / `DD-MMM-YYYY` (e.g. 15 JUL 2026, 15-Jul-2024, 05 OGO 2026)
 * - `DD MMM YY` (e.g. 15 JUL 26 -> 2026-07-15)
 * - `DD MMM` (e.g. 15 JUL -> 2026-07-15 with defaultYear)
 */
export function parseFlexibleDate(
  text: string,
  defaultYear: number = new Date().getUTCFullYear(),
): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/.exec(trimmed);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  // 2. Day-first standard: DD/MM/YYYY or DD-MM-YYYY
  const dmy4Match = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/.exec(trimmed);
  if (dmy4Match) {
    const [, d, m, y] = dmy4Match;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  // 3. Month name with 4-digit year: 15 JUL 2026 or 15-Jul-2024
  const monthName4Match =
    /\b(\d{1,2})[\s/-]+([A-Za-z]{3,9})[\s/-]+(\d{4})\b/.exec(trimmed);
  if (monthName4Match) {
    const [, d, monStr, y] = monthName4Match;
    const monthIdx = MONTH_MAP[monStr.toLowerCase()];
    if (monthIdx !== undefined) {
      const date = new Date(Date.UTC(Number(y), monthIdx, Number(d)));
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }

  // 4. 2-digit year day-first: DD/MM/YY or DD-MM-YY (e.g. 15/07/26 or 15/07/24)
  const dmy2Match = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/.exec(trimmed);
  if (dmy2Match) {
    const [, d, m, y] = dmy2Match;
    const yr = Number(y);
    const fullYear = yr < 50 ? 2000 + yr : 1900 + yr;
    const date = new Date(Date.UTC(fullYear, Number(m) - 1, Number(d)));
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  // 5. Month name with 2-digit year: 15 JUL 26 or 15-JUL-26
  const monthName2Match =
    /\b(\d{1,2})[\s/-]+([A-Za-z]{3,9})[\s/-]+(\d{2})\b/.exec(trimmed);
  if (monthName2Match) {
    const [, d, monStr, y] = monthName2Match;
    const monthIdx = MONTH_MAP[monStr.toLowerCase()];
    if (monthIdx !== undefined) {
      const yr = Number(y);
      const fullYear = yr < 50 ? 2000 + yr : 1900 + yr;
      const date = new Date(Date.UTC(fullYear, monthIdx, Number(d)));
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }

  // 6. Month name without year: 15 JUL or 15-JUL (defaults to defaultYear)
  const monthNameNoYearMatch =
    /\b(\d{1,2})[\s/-]+([A-Za-z]{3,9})\b/.exec(trimmed);
  if (monthNameNoYearMatch) {
    const [, d, monStr] = monthNameNoYearMatch;
    const monthIdx = MONTH_MAP[monStr.toLowerCase()];
    if (monthIdx !== undefined) {
      const date = new Date(Date.UTC(defaultYear, monthIdx, Number(d)));
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }

  // 7. Day-month without year: DD/MM or DD-MM (e.g. 15/07 or 01/08, common in card statements)
  const dmMatch = /\b(\d{1,2})[/-](\d{1,2})\b/.exec(trimmed);
  if (dmMatch) {
    const [, d, m] = dmMatch;
    const day = Number(d);
    const month = Number(m);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const date = new Date(Date.UTC(defaultYear, month - 1, day));
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }

  // 8. Standard ISO timestamp fallback (strict format: 2026-08-20 or 2026-08-20T...)
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/i.test(trimmed)) {
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return null;
}

/**
 * Flexible amount parser for Malaysian bank statements.
 *
 * Handles:
 * - Trailing minus: `15.90-` / `15.90 -`
 * - Leading minus: `-15.90`
 * - Debit markers: `15.90 DR` / `15.90DR` / `15.90 CR`
 * - Parentheses: `(15.90)`
 * - Commas in thousands: `1,250.00`
 * - Currency prefix: `RM 15.90` / `MYR 15.90`
 * - Whole integer amounts: `RM 60` or `100.00`
 */
export function parseFlexibleAmount(cellOrLine: string): number | null {
  const normalized = cellOrLine.trim().replace(/,/g, '');
  if (!normalized) return null;

  // 1. Trailing minus sign: e.g. 15.90- or 15.90 - (requires decimal .XX to prevent matching 2026- in dates)
  const trailingMinus = /(?:RM|MYR)?\s*(\d{1,7}\.\d{1,2})\s*[-–]/i.exec(normalized);
  if (trailingMinus) {
    return myrToSen(trailingMinus[1]);
  }

  // 2. DR / Debit indicator: e.g. 15.90 DR or 15.90DR
  const drMatch = /(?:RM|MYR)?\s*(\d{1,7}(?:\.\d{1,2})?)\s*DR\b/i.exec(normalized);
  if (drMatch) {
    return myrToSen(drMatch[1]);
  }

  // 3. Parentheses negative: e.g. (15.90) or (RM 15.90)
  const parenMatch = /\(\s*(?:RM|MYR)?\s*(\d{1,7}(?:\.\d{1,2})?)\s*\)/i.exec(normalized);
  if (parenMatch) {
    return myrToSen(parenMatch[1]);
  }

  // 4. Currency prefix RM / MYR with whole or decimal amount (e.g. RM 60 or RM 15.90)
  const currencyMatch = /(?:RM|MYR)\s*[-–]?\s*(\d{1,7}(?:\.\d{1,2})?)/i.exec(normalized);
  if (currencyMatch) {
    return myrToSen(currencyMatch[1]);
  }

  // 5. Standard decimal amount: e.g. 15.90 (negative lookbehind to avoid date parts)
  const match = /(?<!\d[-/])[-–]?\s*(\d{1,7}\.\d{1,2})/i.exec(normalized);
  if (match) {
    return myrToSen(match[1]);
  }

  return null;
}
