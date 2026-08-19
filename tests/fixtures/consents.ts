/**
 * Synthetic consent fixtures (tests/AGENTS.md: 100% synthetic data).
 * Schema-validated at load so a bad fixture fails fast.
 */
import type { AuditEvent, ConsentRecord } from '@/features/consent';
import { consentRecordSchema } from '@/lib/validation';

const rawConsents: readonly ConsentRecord[] = [
  {
    purpose: 'transaction_import',
    status: 'granted',
    consentVersion: 'consent_v1',
    grantedAt: '2026-06-12T08:30:00.000Z',
    withdrawnAt: null,
  },
  {
    purpose: 'ai_assist',
    status: 'granted',
    consentVersion: 'consent_v1',
    grantedAt: '2026-06-12T08:31:00.000Z',
    withdrawnAt: null,
  },
  {
    purpose: 'analytics',
    status: 'withdrawn',
    consentVersion: 'consent_v1',
    grantedAt: '2026-06-12T08:32:00.000Z',
    withdrawnAt: '2026-07-04T14:10:00.000Z',
  },
  {
    purpose: 'notifications',
    status: 'withdrawn',
    consentVersion: 'consent_v1',
    grantedAt: null,
    withdrawnAt: null,
  },
];

export const syntheticConsents: readonly ConsentRecord[] = rawConsents.map((c) =>
  consentRecordSchema.parse(c),
);

export const syntheticAuditEvents: readonly AuditEvent[] = [
  {
    type: 'consent_granted',
    purpose: 'transaction_import',
    at: '2026-06-12T08:30:00.000Z',
  },
  {
    type: 'consent_granted',
    purpose: 'ai_assist',
    at: '2026-06-12T08:31:00.000Z',
  },
  {
    type: 'consent_withdrawn',
    purpose: 'analytics',
    at: '2026-07-04T14:10:00.000Z',
  },
];
