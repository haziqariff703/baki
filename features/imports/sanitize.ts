/**
 * Sanitisation helpers for untrusted imported content.
 *
 * AGENTS.md §12 / features/imports/AGENTS.md: every extracted string from an
 * uploaded CSV/PDF is treated strictly as *data*, never as prompt instructions
 * (prompt-injection defense). These are pure, deterministic functions: no LLM,
 * no external lookup, no randomness.
 */

/** Maximum length of any sanitised free-text field (defense against blow-up). */
export const MAX_TEXT_LENGTH = 500;
/** Maximum length of a merchant name (matches importRowSchema, §7). */
export const MAX_MERCHANT_NAME_LENGTH = 120;

/** Keep printable ASCII/Latin-1 control-free characters only. */
const CONTROL_CHAR = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
/** Collapse runs of whitespace (incl. newlines, tabs) into a single space. */
const WHITESPACE_RUN = /\s+/g;

function stripControlChars(input: string): string {
  return input.replace(CONTROL_CHAR, '');
}

/**
 * Sanitise arbitrary extracted text (e.g. PDF page content).
 *
 * - Removes control characters (keeps printable characters only).
 * - Collapses runs of whitespace to single spaces and trims.
 * - Caps the result at MAX_TEXT_LENGTH.
 *
 * This is the prompt-injection defense boundary: the returned string is a
 * plain data payload and is never interpreted as instructions.
 */
export function sanitizeText(input: string): string {
  return stripControlChars(input).replace(WHITESPACE_RUN, ' ').trim().slice(0, MAX_TEXT_LENGTH);
}

/**
 * Normalise a merchant name extracted from a statement.
 *
 * Deterministic: trims, collapses internal whitespace, strips control
 * characters, and caps the length. Does NOT perform external lookup or AI
 * normalisation (that is a separate, advisory capability — §13.1).
 */
export function sanitizeMerchantName(input: string): string {
  return stripControlChars(input).replace(WHITESPACE_RUN, ' ').trim().slice(0, MAX_MERCHANT_NAME_LENGTH);
}
