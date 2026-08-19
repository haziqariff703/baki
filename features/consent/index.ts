/**
 * Privacy Consent Tracking Feature Module
 *
 * Public API. Deterministic pure logic; persistence abstracted behind
 * `ConsentRepository` (§5.3) for a later DB adapter.
 */
export {
  CONSENT_PURPOSES,
  CONSENT_RULE_VERSION,
  DELETION_PHRASE,
  appendAuditEvent,
  buildExportPayload,
  grantConsent,
  validateDeletionConfirmation,
  withdrawConsent,
} from './logic';
export { SupabaseConsentRepository } from './repository';
export type {
  AuditEvent,
  ConsentPurpose,
  ConsentRecord,
  ConsentRepository,
  ConsentStatus,
  DeletionGateResult,
  ExportFormat,
  ExportPayload,
} from './types';
