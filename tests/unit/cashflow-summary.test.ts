/**
 * Unit tests for the subscription→renewal projection (AGENTS.md §5.3, §2.1)
 * and the cash-flow validation boundary (§7).
 * Synthetic fixtures only (tests/AGENTS.md).
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_REMINDER_OFFSETS,
  subscriptionToUpcomingRenewal,
} from '@/features/cash-flow';
import type { Subscription } from '@/features/subscriptions';
import {
  cashFlowSummaryQuerySchema,
  cashFlowSummaryResponseSchema,
  cashFlowSummarySchema,
  upcomingRenewalSchema,
} from '@/lib/validation';

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 'sub-1',
    merchantName: 'Spotify',
    amountSen: 1590,
    cycle: 'monthly',
    nextChargeDate: '2026-08-16T00:00:00.000Z',
    usage: 5,
    necessity: 3,
    affordability: 5,
    uniqueness: 3,
    satisfaction: 5,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('subscriptionToUpcomingRenewal (§5.3 projection)', () => {
  it('maps fields and injects the default reminder offsets', () => {
    const s = subscription();
    const renewal = subscriptionToUpcomingRenewal(s);

    expect(renewal).toEqual({
      id: 'sub-1',
      merchantName: 'Spotify',
      amountSen: 1590,
      cycle: 'monthly',
      nextChargeDate: '2026-08-16T00:00:00.000Z',
      reminderOffsets: [7, 1, 0],
    });
  });

  it('produces a renewal that passes upcomingRenewalSchema', () => {
    const renewal = subscriptionToUpcomingRenewal(subscription());
    expect(() => upcomingRenewalSchema.parse(renewal)).not.toThrow();
  });

  it('does not mutate the input subscription', () => {
    const s = subscription();
    subscriptionToUpcomingRenewal(s);
    expect(s).toEqual(subscription());
  });

  it('is deterministic: same input → same output', () => {
    const s = subscription();
    expect(subscriptionToUpcomingRenewal(s)).toEqual(subscriptionToUpcomingRenewal(s));
  });

  it('DEFAULT_REMINDER_OFFSETS is the 7d/1d/day-of spec', () => {
    expect(DEFAULT_REMINDER_OFFSETS).toEqual([7, 1, 0]);
  });
});

describe('cashFlowSummarySchema — zero-commitment fix (§8.1)', () => {
  it('accepts a zero monthly commitment (empty dashboard)', () => {
    expect(
      cashFlowSummarySchema.parse({
        monthlyCommitmentSen: 0,
        annualisedTotalSen: 0,
        safeToSpendSen: -0,
        upcomingCount: 0,
      }),
    ).toBeTruthy();
  });

  it('accepts a non-zero commitment', () => {
    expect(
      cashFlowSummarySchema.parse({
        monthlyCommitmentSen: 3500,
        annualisedTotalSen: 42000,
        safeToSpendSen: 5000,
        upcomingCount: 2,
      }),
    ).toBeTruthy();
  });

  it('rejects a negative monthly commitment', () => {
    expect(() =>
      cashFlowSummarySchema.parse({
        monthlyCommitmentSen: -1,
        annualisedTotalSen: 0,
        safeToSpendSen: 0,
        upcomingCount: 0,
      }),
    ).toThrow();
  });
});

describe('cashFlowSummaryResponseSchema (§7 trust boundary)', () => {
  it('accepts a full payload with payday analysis', () => {
    const renewal = {
      id: 'sub-1',
      merchantName: 'Spotify',
      amountSen: 1590,
      nextChargeDate: '2026-08-16T00:00:00.000Z',
      cycle: 'monthly' as const,
      reminderOffsets: [7, 1, 0],
    };
    const payload = {
      summary: {
        monthlyCommitmentSen: 1590,
        annualisedTotalSen: 19080,
        safeToSpendSen: 0,
        upcomingCount: 1,
      },
      next30DayTotalSen: 1590,
      upcoming: [renewal],
      paydayAnalysis: {
        paydayDayOfMonth: 25,
        nextPaydayDate: '2026-08-25T00:00:00.000Z',
        daysUntilPayday: 9,
        beforePaydayTotalSen: 1590,
        beforePaydayCount: 1,
        afterPaydayTotalSen: 0,
        afterPaydayCount: 0,
        isTightWindow: true,
      },
    };
    expect(() => cashFlowSummaryResponseSchema.parse(payload)).not.toThrow();
  });

  it('accepts a null payday analysis', () => {
    const payload = {
      summary: {
        monthlyCommitmentSen: 0,
        annualisedTotalSen: 0,
        safeToSpendSen: 0,
        upcomingCount: 0,
      },
      next30DayTotalSen: 0,
      upcoming: [],
      paydayAnalysis: null,
    };
    expect(() => cashFlowSummaryResponseSchema.parse(payload)).not.toThrow();
  });

  it('rejects unexpected fields (strict)', () => {
    expect(() =>
      cashFlowSummaryResponseSchema.parse({
        summary: { monthlyCommitmentSen: 0, annualisedTotalSen: 0, safeToSpendSen: 0, upcomingCount: 0 },
        next30DayTotalSen: 0,
        upcoming: [],
        paydayAnalysis: null,
        evil: true,
      }),
    ).toThrow();
  });
});

describe('cashFlowSummaryQuerySchema (§7 query boundary)', () => {
  it('accepts empty params', () => {
    expect(() => cashFlowSummaryQuerySchema.parse({})).not.toThrow();
  });

  it('accepts a valid fromDate and paydayDayOfMonth', () => {
    expect(() =>
      cashFlowSummaryQuerySchema.parse({
        fromDate: '2026-08-16',
        paydayDayOfMonth: 25,
      }),
    ).not.toThrow();
  });

  it('rejects a malformed fromDate', () => {
    expect(() =>
      cashFlowSummaryQuerySchema.parse({ fromDate: '16-08-2026' }),
    ).toThrow();
  });

  it('rejects a payday day out of range', () => {
    expect(() =>
      cashFlowSummaryQuerySchema.parse({ paydayDayOfMonth: 32 }),
    ).toThrow();
    expect(() =>
      cashFlowSummaryQuerySchema.parse({ paydayDayOfMonth: 0 }),
    ).toThrow();
  });

  it('rejects unknown query fields (strict)', () => {
    expect(() =>
      cashFlowSummaryQuerySchema.parse({ limit: '100' }),
    ).toThrow();
  });
});
