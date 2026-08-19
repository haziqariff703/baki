/**
 * Calendar-Aware Date & Renewal Utilities
 *
 * AGENTS.md §9: dates are calendar-aware. Never compute recurring dates by
 * adding a fixed number of milliseconds. All math here uses UTC calendar
 * operations so month lengths and leap years are handled by the Date engine.
 */

const MS_PER_DAY = 86_400_000;

/** Parse an ISO string to a UTC-midnight timestamp, or null if invalid. */
function toUtcMidnight(iso: string): number | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  const d = new Date(time);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Whole calendar days from `fromDate` to `targetDate` (UTC, midnight-aligned).
 * Negative if target is in the past. Returns null on invalid input.
 */
export function daysUntil(targetDate: string, fromDate: string): number | null {
  const target = toUtcMidnight(targetDate);
  const from = toUtcMidnight(fromDate);
  if (target === null || from === null) return null;
  return Math.round((target - from) / MS_PER_DAY);
}

/** ISO date (YYYY-MM-DD) portion of an ISO timestamp. */
export function toDatePart(iso: string): string {
  return iso.slice(0, 10);
}
