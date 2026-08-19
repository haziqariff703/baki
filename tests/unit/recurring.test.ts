/**
 * Unit tests for the recurring-payment candidate domain (M2).
 *
 * Covers AGENTS.md §2.2 (human-controlled state transitions), §8.1 (integer
 * sen money), and §7 (Zod trust-boundary rejection). All fixtures are
 * synthetic (tests/AGENTS.md).
 */
import { describe, expect, it } from 'vitest';

import {
  applyConfirmation,
  applyEdit,
  deriveRecommendationHint,
  formatAmount,
  formatCadenceEvidence,
  toSubscription,
  detectRecurringCadence,
  type RecurringCandidate,
} from '@/features/recurring-detection';
import { senToMyr, myrToSen } from '@/lib/money';
import {
  candidateEditSchema,
  confirmCandidateSchema,
  recurringCandidateSchema,
  rejectCandidateSchema,
} from '@/lib/validation';

function pendingCandidate(
  overrides: Partial<RecurringCandidate> = {},
): RecurringCandidate {
  return {
    id: 'cand-001',
    merchantName: 'Spotify',
    amountSen: 1590,
    occurrenceCount: 3,
    intervalDays: 30,
    aiConfidence: 0.82,
    detectedAt: '2026-07-01T00:00:00.000Z',
    status: { state: 'pending' },
    ...overrides,
  };
}

describe('applyConfirmation (§2.2 human-controlled transitions)', () => {
  it('pending → confirmed stamps confirmedAt', () => {
    const result = applyConfirmation(pendingCandidate(), {
      action: 'confirm',
      confirmedAt: '2026-08-01T10:00:00.000Z',
    });
    expect(result.status).toEqual({
      state: 'confirmed',
      confirmedAt: '2026-08-01T10:00:00.000Z',
    });
  });

  it('pending → rejected stamps rejectedAt', () => {
    const result = applyConfirmation(pendingCandidate(), {
      action: 'reject',
      rejectedAt: '2026-08-01T10:00:00.000Z',
    });
    expect(result.status).toEqual({
      state: 'rejected',
      rejectedAt: '2026-08-01T10:00:00.000Z',
    });
  });

  it('cannot re-confirm an already confirmed candidate (no-op)', () => {
    const confirmed = applyConfirmation(pendingCandidate(), {
      action: 'confirm',
      confirmedAt: '2026-08-01T10:00:00.000Z',
    });
    const again = applyConfirmation(confirmed, {
      action: 'reject',
      rejectedAt: '2026-08-02T10:00:00.000Z',
    });
    expect(again.status.state).toBe('confirmed');
  });

  it('cannot resurrect a rejected candidate (no-op)', () => {
    const rejected = applyConfirmation(pendingCandidate(), {
      action: 'reject',
      rejectedAt: '2026-08-01T10:00:00.000Z',
    });
    const again = applyConfirmation(rejected, {
      action: 'confirm',
      confirmedAt: '2026-08-02T10:00:00.000Z',
    });
    expect(again.status.state).toBe('rejected');
  });

  it('is deterministic: same decision yields identical output', () => {
    const c = pendingCandidate();
    const d = { action: 'confirm' as const, confirmedAt: '2026-08-01T10:00:00.000Z' };
    expect(applyConfirmation(c, d)).toEqual(applyConfirmation(c, d));
  });
});

describe('applyEdit', () => {
  it('edits merchant and amount on a pending candidate', () => {
    const result = applyEdit(pendingCandidate(), {
      merchantName: 'Spotify Premium',
      amountSen: 1690,
    });
    expect(result.merchantName).toBe('Spotify Premium');
    expect(result.amountSen).toBe(1690);
  });

  it('preserves untouched fields', () => {
    const result = applyEdit(pendingCandidate(), { merchantName: 'Netflix' });
    expect(result.amountSen).toBe(1590);
  });

  it('does not edit a decided candidate', () => {
    const rejected = applyConfirmation(pendingCandidate(), {
      action: 'reject',
      rejectedAt: '2026-08-01T10:00:00.000Z',
    });
    const edited = applyEdit(rejected, { merchantName: 'Nope' });
    expect(edited.merchantName).toBe('Spotify');
  });
});

describe('toSubscription', () => {
  it('projects a confirmed candidate into a subscription row', () => {
    const confirmed = applyConfirmation(pendingCandidate(), {
      action: 'confirm',
      confirmedAt: '2026-08-01T10:00:00.000Z',
    });
    const sub = toSubscription(confirmed);
    expect(sub).toEqual({
      id: 'cand-001',
      merchantName: 'Spotify',
      amountSen: 1590,
      intervalDays: 30,
      confirmedAt: '2026-08-01T10:00:00.000Z',
    });
  });

  it('returns null for a pending candidate', () => {
    expect(toSubscription(pendingCandidate())).toBeNull();
  });
});

describe('formatCadenceEvidence', () => {
  it('formats count and interval compactly', () => {
    expect(formatCadenceEvidence(3, 30)).toBe('3× · ~30d');
    expect(formatCadenceEvidence(12, 7)).toBe('12× · ~7d');
  });
});

describe('deriveRecommendationHint (advisory only, §13.1)', () => {
  it('high confidence + repeated → likely_recurring', () => {
    expect(
      deriveRecommendationHint(pendingCandidate({ aiConfidence: 0.9, occurrenceCount: 4 })),
    ).toBe('likely_recurring');
  });
  it('mid confidence → uncertain', () => {
    expect(
      deriveRecommendationHint(pendingCandidate({ aiConfidence: 0.6, occurrenceCount: 2 })),
    ).toBe('uncertain');
  });
  it('low confidence → needs_review', () => {
    expect(
      deriveRecommendationHint(pendingCandidate({ aiConfidence: 0.3 })),
    ).toBe('needs_review');
  });
});

describe('MoneyInSen formatting (§8.1)', () => {
  it('senToMyr converts integer sen to MYR string', () => {
    expect(senToMyr(1590)).toBe('15.90');
    expect(senToMyr(1000)).toBe('10.00');
    expect(senToMyr(5)).toBe('0.05');
    expect(senToMyr(221400)).toBe('2214.00');
  });

  it('formatAmount delegates to senToMyr', () => {
    expect(formatAmount(1590)).toBe('15.90');
  });

  it('myrToSen parses MYR string into integer sen (no floats)', () => {
    expect(myrToSen('15.90')).toBe(1590);
    expect(myrToSen('10')).toBe(1000);
    expect(myrToSen('0.05')).toBe(5);
  });

  it('myrToSen rejects invalid input', () => {
    expect(myrToSen('abc')).toBeNull();
    expect(myrToSen('12.345')).toBeNull();
    expect(myrToSen('')).toBeNull();
  });
});

describe('Zod trust boundary (§7)', () => {
  it('recurringCandidateSchema accepts a valid candidate', () => {
    expect(() => recurringCandidateSchema.parse(pendingCandidate())).not.toThrow();
  });

  it('rejects negative amount in sen', () => {
    expect(() =>
      recurringCandidateSchema.parse(pendingCandidate({ amountSen: -100 })),
    ).toThrow();
  });

  it('rejects non-integer amount', () => {
    expect(() =>
      recurringCandidateSchema.parse(pendingCandidate({ amountSen: 15.9 })),
    ).toThrow();
  });

  it('rejects out-of-range confidence', () => {
    expect(() =>
      recurringCandidateSchema.parse(pendingCandidate({ aiConfidence: 1.5 })),
    ).toThrow();
    expect(() =>
      recurringCandidateSchema.parse(pendingCandidate({ aiConfidence: -0.1 })),
    ).toThrow();
  });

  it('rejects unexpected fields (strict)', () => {
    expect(() =>
      recurringCandidateSchema.parse({ ...pendingCandidate(), extra: 1 }),
    ).toThrow();
  });

  it('confirmCandidateSchema / rejectCandidateSchema validate payloads', () => {
    expect(() =>
      confirmCandidateSchema.parse({
        action: 'confirm',
        confirmedAt: '2026-08-01T10:00:00.000Z',
      }),
    ).not.toThrow();
    expect(() =>
      rejectCandidateSchema.parse({
        action: 'reject',
        rejectedAt: '2026-08-01T10:00:00.000Z',
      }),
    ).not.toThrow();
    expect(() =>
      confirmCandidateSchema.parse({ action: 'confirm', confirmedAt: 'not-a-date' }),
    ).toThrow();
  });

  it('candidateEditSchema requires at least one field', () => {
    expect(() => candidateEditSchema.parse({})).toThrow();
    expect(() => candidateEditSchema.parse({ merchantName: 'Netflix' })).not.toThrow();
  });
});

describe('detectRecurringCadence (§2.1 deterministic cadence detection)', () => {
  it('detects monthly recurring subscriptions from multiple transactions', () => {
    const transactions = [
      { id: '1', merchantName: 'Spotify', amountSen: 1590, transactionDate: '2026-06-01T00:00:00.000Z' },
      { id: '2', merchantName: 'Spotify', amountSen: 1590, transactionDate: '2026-07-01T00:00:00.000Z' },
      { id: '3', merchantName: 'Spotify', amountSen: 1590, transactionDate: '2026-08-01T00:00:00.000Z' },
      { id: '4', merchantName: 'One-off Mamak', amountSen: 1200, transactionDate: '2026-08-02T00:00:00.000Z' },
    ];

    const candidates = detectRecurringCadence(transactions);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].merchantName).toBe('Spotify');
    expect(candidates[0].amountSen).toBe(1590);
    expect(candidates[0].occurrenceCount).toBe(3);
    expect(candidates[0].intervalDays).toBeGreaterThanOrEqual(28);
    expect(candidates[0].intervalDays).toBeLessThanOrEqual(31);
  });

  it('ignores non-subscription transactions with fewer than 2 occurrences', () => {
    const transactions = [
      { id: '1', merchantName: 'GrabFood', amountSen: 2500, transactionDate: '2026-08-01T00:00:00.000Z' },
      { id: '2', merchantName: 'Pasar Malam Setapak', amountSen: 1250, transactionDate: '2026-08-14T00:00:00.000Z' },
    ];

    const candidates = detectRecurringCadence(transactions);
    expect(candidates).toHaveLength(0);
  });

  it('detects known catalog subscriptions even from a single-month statement', () => {
    const transactions = [
      { id: '1', merchantName: 'SPTF*SPOTIFY MALAYSIA', amountSen: 1590, transactionDate: '2026-08-01T00:00:00.000Z' },
      { id: '2', merchantName: 'NETFLIX COM MY', amountSen: 4500, transactionDate: '2026-08-03T00:00:00.000Z' },
      { id: '3', merchantName: 'CELCOMDIGI POSTPAID BILL', amountSen: 6000, transactionDate: '2026-08-05T00:00:00.000Z' },
      { id: '4', merchantName: 'PASAR MALAM SETAPAK', amountSen: 1250, transactionDate: '2026-08-14T00:00:00.000Z' },
    ];

    const candidates = detectRecurringCadence(transactions);
    expect(candidates).toHaveLength(3);
    expect(candidates.map((c) => c.merchantName)).toEqual(['Spotify', 'Netflix', 'CelcomDigi']);
  });
});
