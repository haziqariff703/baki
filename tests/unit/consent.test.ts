/**
 * Unit tests for the consent & data-control domain (M3).
 *
 * Covers §2.3 (grant/withdraw symmetry), §2.6 (version + timestamp stamping),
 * §14.2 (audit events carry no personal data), and §7 (Zod trust boundary).
 * All fixtures synthetic.
 */
import { describe, expect, it } from 'vitest';

import {
  CONSENT_RULE_VERSION,
  appendAuditEvent,
  buildExportPayload,
  grantConsent,
  validateDeletionConfirmation,
  withdrawConsent,
  type AuditEvent,
  type ConsentRecord,
} from '@/features/consent';
import {
  consentPurposeSchema,
  consentRecordSchema,
  deletionConfirmationSchema,
  exportRequestSchema,
} from '@/lib/validation';

function withdrawnRecord(): ConsentRecord {
  return {
    purpose: 'ai_assist',
    status: 'withdrawn',
    consentVersion: 'consent_v1',
    grantedAt: null,
    withdrawnAt: '2026-06-01T00:00:00.000Z',
  };
}

describe('grantConsent / withdrawConsent (§2.3, §2.6)', () => {
  it('grant stamps version + grantedAt and clears withdrawnAt', () => {
    const g = grantConsent(withdrawnRecord(), 'consent_v2', '2026-08-01T10:00:00.000Z');
    expect(g.status).toBe('granted');
    expect(g.consentVersion).toBe('consent_v2');
    expect(g.grantedAt).toBe('2026-08-01T10:00:00.000Z');
    expect(g.withdrawnAt).toBeNull();
  });

  it('withdraw stamps withdrawnAt and keeps grantedAt for traceability', () => {
    const g = grantConsent(withdrawnRecord(), CONSENT_RULE_VERSION, '2026-08-01T10:00:00.000Z');
    const w = withdrawConsent(g, '2026-08-02T10:00:00.000Z');
    expect(w.status).toBe('withdrawn');
    expect(w.withdrawnAt).toBe('2026-08-02T10:00:00.000Z');
    expect(w.grantedAt).toBe('2026-08-01T10:00:00.000Z');
  });

  it('is deterministic', () => {
    const r = withdrawnRecord();
    expect(grantConsent(r, 'consent_v1', '2026-08-01T00:00:00.000Z')).toEqual(
      grantConsent(r, 'consent_v1', '2026-08-01T00:00:00.000Z'),
    );
  });
});

describe('buildExportPayload (deterministic structure)', () => {
  it('produces a fixed shape with version + sections', () => {
    const p = buildExportPayload('json', '2026-08-01T10:00:00.000Z');
    expect(p).toEqual({
      format: 'json',
      generatedAt: '2026-08-01T10:00:00.000Z',
      ruleVersion: CONSENT_RULE_VERSION,
      sections: ['consents', 'subscriptions', 'candidates', 'audit_events'],
    });
  });

  it('is deterministic for the same input', () => {
    expect(buildExportPayload('csv', '2026-08-01T00:00:00.000Z')).toEqual(
      buildExportPayload('csv', '2026-08-01T00:00:00.000Z'),
    );
  });
});

describe('validateDeletionConfirmation (typed gate)', () => {
  it('accepts an exact match', () => {
    expect(validateDeletionConfirmation('DELETE', 'DELETE').allowed).toBe(true);
  });

  it('accepts with surrounding whitespace (trimmed)', () => {
    expect(validateDeletionConfirmation('  DELETE  ', 'DELETE').allowed).toBe(true);
  });

  it('rejects a mismatch', () => {
    expect(validateDeletionConfirmation('delete', 'DELETE').allowed).toBe(false);
    expect(validateDeletionConfirmation('DELETE MY ACCOUNT', 'DELETE').allowed).toBe(false);
    expect(validateDeletionConfirmation('', 'DELETE').allowed).toBe(false);
  });
});

describe('appendAuditEvent (§14.2)', () => {
  it('appends immutably', () => {
    const log: readonly AuditEvent[] = [];
    const next = appendAuditEvent(log, {
      type: 'consent_granted',
      purpose: 'analytics',
      at: '2026-08-01T10:00:00.000Z',
    });
    expect(log).toHaveLength(0);
    expect(next).toHaveLength(1);
    expect(next[0]?.type).toBe('consent_granted');
  });

  it('audit events carry no personal data fields', () => {
    const event: AuditEvent = {
      type: 'data_exported',
      format: 'json',
      at: '2026-08-01T10:00:00.000Z',
    };
    const keys = Object.keys(event);
    expect(keys).not.toContain('email');
    expect(keys).not.toContain('userId');
    expect(keys).not.toContain('name');
  });
});

describe('Zod trust boundary (§7)', () => {
  it('consentPurposeSchema accepts valid purposes, rejects others', () => {
    expect(() => consentPurposeSchema.parse('ai_assist')).not.toThrow();
    expect(() => consentPurposeSchema.parse('marketing')).toThrow();
  });

  it('consentRecordSchema validates a record, rejects extra fields', () => {
    expect(() => consentRecordSchema.parse(withdrawnRecord())).not.toThrow();
    expect(() =>
      consentRecordSchema.parse({ ...withdrawnRecord(), extra: 1 }),
    ).toThrow();
  });

  it('exportRequestSchema validates format enum and rejects client timestamps', () => {
    expect(() => exportRequestSchema.parse({ format: 'json' })).not.toThrow();
    expect(() => exportRequestSchema.parse({ format: 'xml' })).toThrow();
    // §2.6: requestedAt is server-stamped, never client-supplied.
    expect(() =>
      exportRequestSchema.parse({ format: 'json', requestedAt: '2026-08-01T00:00:00.000Z' }),
    ).toThrow();
  });

  it('deletionConfirmationSchema bounds the phrase and rejects client timestamps', () => {
    expect(() => deletionConfirmationSchema.parse({ phrase: 'DELETE' })).not.toThrow();
    expect(() => deletionConfirmationSchema.parse({ phrase: '' })).toThrow();
    // §2.6: requestedAt is server-stamped, never client-supplied.
    expect(() =>
      deletionConfirmationSchema.parse({ phrase: 'DELETE', requestedAt: 'nope' }),
    ).toThrow();
  });
});
