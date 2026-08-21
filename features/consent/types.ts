/**
 * Consent & data-control domain types (M3).
 *
 * AGENTS.md §2.3 Privacy by Design: consent is per-purpose, versioned, and
 * withdraw-as-easy-as-grant. §14.2: consent/export/deletion are audit events
 * that must NOT retain personal data.
 */

/** The distinct purposes a user can consent to. Language-independent. */
export type ConsentPurpose =
  | 'transaction_import'
  | 'ai_assist'
  | 'analytics'
  | 'notifications';

/** Consent lifecycle status. */
export type ConsentStatus = 'granted' | 'withdrawn';

/** A single per-purpose consent record with version traceability (§2.6). */
export interface ConsentRecord {
  readonly purpose: ConsentPurpose;
  readonly status: ConsentStatus;
  /** Version of the consent text the user agreed to, e.g. 'consent_v1'. */
  readonly consentVersion: string;
  /** ISO UTC when consent was last granted. */
  readonly grantedAt: string | null;
  /** ISO UTC when consent was withdrawn (null while granted). */
  readonly withdrawnAt: string | null;
}

/**
 * Audit event (§14.2). Carries only the action, purpose (where relevant), and
 * timestamp — never personal data, financial figures, or document contents.
 */
export type AuditEvent =
  | { readonly type: 'consent_granted'; readonly purpose: ConsentPurpose; readonly at: string }
  | { readonly type: 'consent_withdrawn'; readonly purpose: ConsentPurpose; readonly at: string }
  | { readonly type: 'data_exported'; readonly format: 'json' | 'csv'; readonly at: string }
  | { readonly type: 'account_deletion_requested'; readonly at: string };

/** Export format choice. */
export type ExportFormat = 'json' | 'csv';

/**
 * Deterministic export payload shape. Structure is fixed; contents are the
 * user's own records (filled by the repository layer at runtime).
 */
export interface ExportPayload {
  readonly format: ExportFormat;
  readonly generatedAt: string;
  readonly ruleVersion: string;
  readonly sections: readonly string[];
}

/** Result of validating a typed deletion-confirmation phrase. */
export interface DeletionGateResult {
  readonly allowed: boolean;
}

/**
 * Repository interface for consent/data-control persistence (AGENTS.md §5.3).
 * A Supabase adapter plugs in later; the UI and logic depend only on this
 * abstraction. Every method takes the authenticated `userId` explicitly so
 * ownership is enforced at the application layer too (§11 step 3, §10.1).
 */
export interface ConsentRepository {
  listConsents(userId: string): Promise<readonly ConsentRecord[]>;
  /** Append-only audit trail for the user (§14.2). */
  listAuditEvents(userId: string): Promise<readonly AuditEvent[]>;
  grant(purpose: ConsentPurpose, version: string, at: string): Promise<ConsentRecord>;
  withdraw(purpose: ConsentPurpose, at: string): Promise<ConsentRecord>;
  requestExport(format: ExportFormat, at: string): Promise<ExportPayload>;
  requestDeletion(at: string): Promise<void>;
}
