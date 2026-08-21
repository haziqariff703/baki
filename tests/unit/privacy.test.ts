/**
 * Unit tests for the privacy/consent slice (AGENTS.md §2.1, §2.2, §14.2, §7).
 * Covers: deterministic serializers (JSON/CSV + CSV-injection escaping), the
 * server-side deletion phrase constant + gate, and the new Zod schemas that
 * reject client-supplied timestamps/versions.
 * Synthetic fixtures only (tests/AGENTS.md).
 */
import { describe, expect, it } from 'vitest';

import { DELETION_PHRASE, validateDeletionConfirmation } from '@/features/consent';
import { serializeCsv, serializeJson } from '@/features/privacy';
import {
  consentToggleSchema,
  deletionConfirmationSchema,
  exportRequestSchema,
} from '@/lib/validation';

const assembled = {
  format: 'json' as const,
  generatedAt: '2026-08-01T00:00:00.000Z',
  ruleVersion: 'consent_v1',
  consents: [
    {
      purpose: 'ai_assist' as const,
      status: 'granted' as const,
      consentVersion: 'consent_v1',
      grantedAt: '2026-06-12T08:30:00.000Z',
      withdrawnAt: null,
    },
  ],
  subscriptions: [
    {
      id: 's1',
      merchantName: 'Spotify',
      amountSen: 1590,
      cycle: 'monthly' as const,
      nextChargeDate: '2026-08-16T00:00:00.000Z',
      usage: 5,
      necessity: 3,
      affordability: 5,
      uniqueness: 3,
      satisfaction: 5,
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
  ],
  candidates: [
    {
      id: 'c1',
      merchantName: 'Netflix',
      amountSen: 5500,
      occurrenceCount: 3,
      intervalDays: 31,
      aiConfidence: 0.81,
      detectedAt: '2026-07-27T09:40:00.000Z',
      status: { state: 'pending' as const },
    },
  ],
};

describe('serializeJson (§2.1 deterministic)', () => {
  it('emits stable, pretty-printed JSON with all sections', () => {
    const json = serializeJson(assembled);
    const parsed = JSON.parse(json);
    expect(parsed.generatedAt).toBe('2026-08-01T00:00:00.000Z');
    expect(parsed.sections.consents).toHaveLength(1);
    expect(parsed.sections.subscriptions).toHaveLength(1);
    expect(parsed.sections.candidates).toHaveLength(1);
  });

  it('is deterministic: same input → same output', () => {
    expect(serializeJson(assembled)).toBe(serializeJson(assembled));
  });
});

describe('serializeCsv (§2.1 + CSV-injection defense)', () => {
  it('emits a header row and one row per record', () => {
    const csv = serializeCsv(assembled);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('Section');
    expect(lines).toHaveLength(4); // header + 1 consent + 1 sub + 1 candidate
  });

  it('neutralizes spreadsheet formula injection', () => {
    const evil = {
      ...assembled,
      subscriptions: [
        {
          ...assembled.subscriptions[0]!,
          merchantName: '=HYPERLINK("http://evil")',
        },
      ],
    };
    const csv = serializeCsv(evil);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toContain(',=HYPERLINK');
  });

  it('quotes cells containing commas or quotes', () => {
    const tricky = {
      ...assembled,
      subscriptions: [
        { ...assembled.subscriptions[0]!, merchantName: 'A, "B" Co' },
      ],
    };
    const csv = serializeCsv(tricky);
    expect(csv).toContain('"A, ""B"" Co"');
  });
});

describe('DELETION_PHRASE + gate (§2.2, §2.3)', () => {
  it('exposes the server-side phrase constant', () => {
    expect(DELETION_PHRASE).toBe('DELETE');
  });

  it('allows only an exact trimmed match', () => {
    expect(validateDeletionConfirmation('DELETE', DELETION_PHRASE).allowed).toBe(true);
    expect(validateDeletionConfirmation('delete', DELETION_PHRASE).allowed).toBe(false);
    expect(validateDeletionConfirmation('DELETE ', DELETION_PHRASE).allowed).toBe(true);
    expect(validateDeletionConfirmation('', DELETION_PHRASE).allowed).toBe(false);
  });
});

describe('consent/export/deletion schemas (§7 — no client timestamps)', () => {
  it('consentToggleSchema accepts a status', () => {
    expect(consentToggleSchema.parse({ status: 'granted' })).toEqual({ status: 'granted' });
  });

  it('consentToggleSchema rejects an unexpected status or extra fields', () => {
    expect(() => consentToggleSchema.parse({ status: 'paused' } as unknown)).toThrow();
    expect(() => consentToggleSchema.parse({ status: 'granted', consentVersion: 'v1' })).toThrow();
  });

  it('exportRequestSchema accepts format only', () => {
    expect(exportRequestSchema.parse({ format: 'csv' })).toEqual({ format: 'csv' });
  });

  it('exportRequestSchema rejects a client-supplied requestedAt (server-stamped §2.6)', () => {
    expect(() =>
      exportRequestSchema.parse({ format: 'json', requestedAt: '2026-08-01T00:00:00.000Z' }),
    ).toThrow();
  });

  it('deletionConfirmationSchema accepts a phrase', () => {
    expect(deletionConfirmationSchema.parse({ phrase: 'DELETE' })).toEqual({ phrase: 'DELETE' });
  });

  it('deletionConfirmationSchema rejects a client-supplied requestedAt', () => {
    expect(() =>
      deletionConfirmationSchema.parse({ phrase: 'DELETE', requestedAt: '2026-08-01T00:00:00.000Z' }),
    ).toThrow();
  });
});
