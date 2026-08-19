/**
 * Supabase adapter for `ConsentRepository` (AGENTS.md §5.3, §10, §14.2).
 *
 * Runs under RLS via the anon-key server client; every query is scoped by
 * `user_id`. Consent toggles delegate to the `set_consent` RPC so the consent
 * row and its audit event are written atomically (never lose an entry).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApplicationError } from '@/lib/logging';
import { CONSENT_RULE_VERSION } from './logic';
import type {
  AuditEvent,
  ConsentPurpose,
  ConsentRecord,
  ConsentRepository,
  ExportFormat,
  ExportPayload,
} from './types';

/** Row shape as stored in public.consents (snake_case). */
interface ConsentRow {
  user_id: string;
  purpose: ConsentPurpose;
  status: 'granted' | 'withdrawn';
  consent_version: string;
  granted_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Row shape as stored in public.audit_events (snake_case). */
interface AuditRow {
  id: string;
  user_id: string;
  action: 'consent_granted' | 'consent_withdrawn' | 'data_exported' | 'account_deletion_requested';
  purpose: ConsentPurpose | null;
  format: ExportFormat | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Map a consents row to the domain ConsentRecord. */
function consentToDomain(row: ConsentRow): ConsentRecord {
  return {
    purpose: row.purpose,
    status: row.status,
    consentVersion: row.consent_version,
    grantedAt: row.granted_at,
    withdrawnAt: row.withdrawn_at,
  };
}

/** Map an audit_events row to the domain AuditEvent (discriminated union). */
function auditToDomain(row: AuditRow): AuditEvent {
  const at = row.created_at;
  switch (row.action) {
    case 'consent_granted':
      return { type: 'consent_granted', purpose: row.purpose ?? 'analytics', at };
    case 'consent_withdrawn':
      return { type: 'consent_withdrawn', purpose: row.purpose ?? 'analytics', at };
    case 'data_exported':
      return { type: 'data_exported', format: row.format ?? 'json', at };
    case 'account_deletion_requested':
      return { type: 'account_deletion_requested', at };
  }
}

function notFound(what: string): ApplicationError {
  return new ApplicationError('NOT_FOUND', `${what} not found`);
}

/**
 * Supabase-backed consent/data-control repository. Construct with the server
 * (anon) client so RLS applies. Do NOT pass a service-role client.
 */
export class SupabaseConsentRepository implements ConsentRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listConsents(userId: string): Promise<readonly ConsentRecord[]> {
    const { data, error } = await this.client
      .from('consents')
      .select('*')
      .eq('user_id', userId)
      .order('purpose', { ascending: true });

    if (error) throw error;
    return (data as ConsentRow[]).map(consentToDomain);
  }

  async listAuditEvents(userId: string): Promise<readonly AuditEvent[]> {
    const { data, error } = await this.client
      .from('audit_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as AuditRow[]).map(auditToDomain);
  }

  /**
   * Grant consent for a purpose — atomic upsert + audit via the RPC.
   * `at` is the server-authoritative timestamp (§2.6).
   */
  async grant(
    purpose: ConsentPurpose,
    version: string,
    at: string,
  ): Promise<ConsentRecord> {
    void at; // timestamp stamped by the DB (now()) inside set_consent
    const { data, error } = await this.client.rpc('set_consent', {
      p_purpose: purpose,
      p_status: 'granted',
      p_version: version,
    });
    if (error) throw error;
    if (!data) throw notFound('Consent');
    return consentToDomain(data as ConsentRow);
  }

  /**
   * Withdraw consent — atomic upsert + audit via the RPC. Withdraw is as easy
   * as grant (§2.3). The consent_version is preserved (the RPC keeps the
   * existing version on withdraw, ignoring the passed one).
   */
  async withdraw(purpose: ConsentPurpose, at: string): Promise<ConsentRecord> {
    void at; // timestamp stamped by the DB (now())
    const { data, error } = await this.client.rpc('set_consent', {
      p_purpose: purpose,
      p_status: 'withdrawn',
      p_version: CONSENT_RULE_VERSION,
    });
    if (error) throw error;
    if (!data) throw notFound('Consent');
    return consentToDomain(data as ConsentRow);
  }

  /** Record a data-export audit event (§14.2). Single append-only insert. */
  async requestExport(format: ExportFormat, at: string): Promise<ExportPayload> {
    void at; // timestamp stamped by the DB (now())
    const { error } = await this.client.from('audit_events').insert({
      action: 'data_exported',
      format,
    });
    if (error) throw error;
    // ExportPayload content is assembled by the privacy use-case; this repo
    // method only records the audit trail. Return a minimal payload marker.
    return { format, generatedAt: new Date().toISOString(), ruleVersion: '', sections: [] };
  }

  /** Record an account-deletion-request audit event (§14.2, staged). */
  async requestDeletion(at: string): Promise<void> {
    void at; // timestamp stamped by the DB (now())
    const { error } = await this.client.from('audit_events').insert({
      action: 'account_deletion_requested',
    });
    if (error) throw error;
  }
}
