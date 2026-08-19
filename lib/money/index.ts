/**
 * Integer Sen <-> MYR Conversion & Currency Utilities
 *
 * AGENTS.md §8.1: monetary values are positive integers representing sen.
 * No floating-point arithmetic for authoritative values.
 */

/** RM 15.90 is stored as 1590. */
export type MoneyInSen = number;

/**
 * Format integer sen as a plain MYR string, e.g. 1590 → "15.90".
 * Pure string/integer math — never floats — so the display always matches
 * the authoritative value.
 */
export function senToMyr(amountSen: MoneyInSen): string {
  const negative = amountSen < 0;
  const abs = Math.abs(amountSen);
  const ringgit = Math.floor(abs / 100);
  const sen = abs % 100;
  const senStr = sen < 10 ? `0${sen}` : String(sen);
  return `${negative ? '-' : ''}${ringgit}.${senStr}`;
}

/** Parse a user-entered MYR string ("15.90") into integer sen, or null. */
export function myrToSen(value: string): MoneyInSen | null {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [ringgitPart, senPart = ''] = trimmed.split('.');
  const ringgit = parseInt(ringgitPart, 10);
  const sen = parseInt((senPart + '00').slice(0, 2), 10);
  return ringgit * 100 + sen;
}
