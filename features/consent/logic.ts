/**
 * Pure deterministic logic for consent & data control (M3).
 *
 * AGENTS.md §2.1: same input → same output, no LLM. §2.3: withdraw is as
 * easy as grant. §14.2: audit events carry no personal data.
 */

import type {
  AuditEvent,
  ConsentPurpose,
  ConsentRecord,
  DeletionGateResult,
  ExportFormat,
  ExportPayload,
} from './types';

/** Current consent-text version stamped on new grants. */
export const CONSENT_RULE_VERSION = 'consent_v1';

/**
 * The exact phrase a user must type to confirm account deletion. Server-side
 * authoritative (§2.2, §11) — never trusted from the client UI (the client
 * only sends the typed text; the comparison happens here).
 */
export const DELETION_PHRASE = 'DELETE';

/** Sections included in a data export, in fixed order. */
const EXPORT_SECTIONS = [
  'consents',
  'subscriptions',
  'candidates',
  'audit_events',
] as const;

/** Grant consent for a purpose, stamping version + timestamp (§2.6). */
export function grantConsent(
  record: ConsentRecord,
  version: string,
  at: string,
): ConsentRecord {
  return {
    ...record,
    status: 'granted',
    consentVersion: version,
    grantedAt: at,
    withdrawnAt: null,
  };
}

/** Withdraw consent — symmetric with grant, no extra friction (§2.3). */
export function withdrawConsent(record: ConsentRecord, at: string): ConsentRecord {
  return {
    ...record,
    status: 'withdrawn',
    withdrawnAt: at,
  };
}

/** Build the deterministic export payload structure. */
export function buildExportPayload(
  format: ExportFormat,
  generatedAt: string,
): ExportPayload {
  return {
    format,
    generatedAt,
    ruleVersion: CONSENT_RULE_VERSION,
    sections: EXPORT_SECTIONS,
  };
}

/**
 * Validate the typed deletion-confirmation phrase. Pure exact string compare
 * (case-sensitive, trimmed) — the gate for the destructive action.
 */
export function validateDeletionConfirmation(
  typedText: string,
  expected: string,
): DeletionGateResult {
  return { allowed: typedText.trim() === expected };
}

/** Append an audit event immutably (§14.2). */
export function appendAuditEvent(
  log: readonly AuditEvent[],
  event: AuditEvent,
): readonly AuditEvent[] {
  return [...log, event];
}

/** Ordered list of all consent purposes (drives UI rendering). */
export const CONSENT_PURPOSES: readonly ConsentPurpose[] = [
  'transaction_import',
  'ai_assist',
  'analytics',
  'notifications',
];
