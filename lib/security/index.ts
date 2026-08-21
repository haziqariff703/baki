/**
 * Redaction & sanitisation helpers (AGENTS.md §2.3, §12, §13).
 *
 * Before any text reaches the AI adapter, logging, or storage, strip account
 * numbers, card fragments, home addresses, and personal identifiers.
 */

/** Card-like numbers: 12–19 contiguous digits (optionally grouped). */
const CARD_LIKE = /\b(?:\d[ -]?){12,19}\b/g;

/** Account/reference numbers: long digit runs (10+). */
const LONG_DIGIT_RUN = /\b\d{10,}\b/g;

/** Email addresses. */
const EMAIL = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g;

/** Malaysian IC / passport-like identifiers (heuristic). */
const IC_LIKE = /\b\d{6}[-\s]?\d{2}[-\s]?\d{4}\b/g;

const REDACT = '[REDACTED]';

/**
 * Redact common sensitive patterns from free-form text.
 * Pure and deterministic (§2.1).
 */
export function redactSensitive(text: string): string {
  return text
    .replace(EMAIL, REDACT)
    .replace(CARD_LIKE, REDACT)
    .replace(IC_LIKE, REDACT)
    .replace(LONG_DIGIT_RUN, REDACT);
}

/**
 * Trim/collapse whitespace and strip control characters from a string.
 * Used on merchant names and other user-supplied display strings (§7).
 */
export function sanitizeText(text: string, maxLength = 120): string {
  return text
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
