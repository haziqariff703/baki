/**
 * Sanitised operational & audit logger (AGENTS.md §14).
 *
 * Operational logs: system health, durations, error codes, AI availability.
 * Audit events: consent/security actions (§14.2).
 *
 * NEVER log passwords, tokens, request bodies, account numbers, or financial
 * figures (§14.2, §19). Keep this module framework-independent.
 */

/** Typed application error codes (AGENTS.md §14.1). */
export type ApplicationErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'FILE_PROCESSING_FAILED'
  | 'INTERNAL_ERROR';

/** HTTP status mapped per error code for route-handler responses. */
export const HTTP_STATUS: Readonly<Record<ApplicationErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  AI_UNAVAILABLE: 503,
  FILE_PROCESSING_FAILED: 422,
  INTERNAL_ERROR: 500,
};

/**
 * A typed application error carrying a stable code and a user-safe message.
 * The message never exposes stack traces, SQL details, or internal IDs (§14.1).
 */
export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;
  readonly status: number;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.status = HTTP_STATUS[code];
  }
}

/** Log levels for the operational logger. */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface OperationalLogEntry {
  readonly level: LogLevel;
  readonly message: string;
  /** Error code only — never the message body if it may contain PII. */
  readonly errorCode?: ApplicationErrorCode;
  /** Safe numeric metrics (durations in ms, counts). Never financial figures. */
  readonly durationMs?: number;
}

/**
 * Log an operational event with sanitised fields only. No request bodies,
 * no tokens, no financial values.
 */
export function logOperational(entry: OperationalLogEntry): void {
  // Minimal, sanitised console output. Swap for a structured sink in prod.
  const line: Record<string, unknown> = {
    level: entry.level,
    message: entry.message,
  };
  if (entry.errorCode) line.errorCode = entry.errorCode;
  if (entry.durationMs !== undefined) line.durationMs = entry.durationMs;

  const serialized = JSON.stringify(line);
  switch (entry.level) {
    case 'error':
      console.error(serialized);
      break;
    case 'warn':
      console.warn(serialized);
      break;
    default:
      console.info(serialized);
  }
}

/** Audit-event action keys (§14.2). Never carries personal/financial data. */
export type AuditAction =
  | 'consent_granted'
  | 'consent_withdrawn'
  | 'data_exported'
  | 'account_deletion_requested';

/**
 * Record an audit event with only non-sensitive metadata. The concrete
 * persistence (Supabase audit_events table) is wired by the repository layer.
 */
export function audit(action: AuditAction, at: string): void {
  // Placeholder: the audit_events table is introduced in a later migration.
  // We emit a sanitised operational line only (no PII, no financial figures).
  logOperational({ level: 'info', message: `audit:${action}`, errorCode: undefined });
  void at;
}
