/**
 * Unit tests for deterministic cycle derivation + calendar-aware next-charge
 * math (AGENTS.md §2.1, §9) and the decision validation boundary (§7).
 * Synthetic fixtures only (tests/AGENTS.md).
 */
import { describe, expect, it } from 'vitest';

import {
  cycleFromIntervalDays,
  nextChargeAfterCycle,
} from '@/features/recurring-detection';
import { candidateDecisionSchema } from '@/lib/validation';

describe('cycleFromIntervalDays (deterministic §2.1)', () => {
  it.each([
    [7, 'weekly'],
    [10, 'weekly'],
    [11, 'monthly'],
    [30, 'monthly'],
    [45, 'monthly'],
    [46, 'quarterly'],
    [90, 'quarterly'],
    [100, 'quarterly'],
    [101, 'yearly'],
    [365, 'yearly'],
  ])('interval %d → %s', (interval, expected) => {
    expect(cycleFromIntervalDays(interval)).toBe(expected);
  });

  it('is pure: same input → same output', () => {
    expect(cycleFromIntervalDays(30)).toBe(cycleFromIntervalDays(30));
  });
});

describe('nextChargeAfterCycle (calendar-aware §9)', () => {
  it('adds one week for weekly', () => {
    expect(nextChargeAfterCycle('2026-01-01T00:00:00.000Z', 'weekly')).toBe(
      '2026-01-08T00:00:00.000Z',
    );
  });

  it('adds one month for monthly', () => {
    expect(nextChargeAfterCycle('2026-01-15T00:00:00.000Z', 'monthly')).toBe(
      '2026-02-15T00:00:00.000Z',
    );
  });

  it('clamps Jan 31 + 1 month to Feb 28 (non-leap)', () => {
    expect(nextChargeAfterCycle('2027-01-31T00:00:00.000Z', 'monthly')).toBe(
      '2027-02-28T00:00:00.000Z',
    );
  });

  it('clamps Jan 31 + 1 month to Feb 29 in a leap year', () => {
    expect(nextChargeAfterCycle('2028-01-31T00:00:00.000Z', 'monthly')).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });

  it('clamps Nov 30 + 1 month to Dec 30 (day preserved)', () => {
    expect(nextChargeAfterCycle('2026-11-30T00:00:00.000Z', 'monthly')).toBe(
      '2026-12-30T00:00:00.000Z',
    );
  });

  it('adds 3 months for quarterly with day clamp', () => {
    expect(nextChargeAfterCycle('2026-08-31T00:00:00.000Z', 'quarterly')).toBe(
      '2026-11-30T00:00:00.000Z',
    );
  });

  it('adds 1 year for yearly', () => {
    expect(nextChargeAfterCycle('2026-06-15T00:00:00.000Z', 'yearly')).toBe(
      '2027-06-15T00:00:00.000Z',
    );
  });

  it('handles Feb 29 → Feb 28 next year (non-leap)', () => {
    expect(nextChargeAfterCycle('2028-02-29T00:00:00.000Z', 'yearly')).toBe(
      '2029-02-28T00:00:00.000Z',
    );
  });

  it('never uses fixed-millisecond arithmetic (Feb boundary)', () => {
    // Jan 31 + 28 days would be Feb 28 only by coincidence; calendar math
    // must produce the clamped month-day, not a 30-day offset.
    const out = nextChargeAfterCycle('2026-01-31T00:00:00.000Z', 'monthly');
    expect(out.startsWith('2026-02-')).toBe(true);
  });
});

describe('candidateDecisionSchema (§7 trust boundary)', () => {
  it('accepts a confirm action', () => {
    expect(candidateDecisionSchema.parse({ action: 'confirm' })).toEqual({
      action: 'confirm',
    });
  });

  it('accepts a reject action', () => {
    expect(candidateDecisionSchema.parse({ action: 'reject' })).toEqual({
      action: 'reject',
    });
  });

  it('rejects unknown actions', () => {
    expect(() =>
      candidateDecisionSchema.parse({ action: 'delete' } as unknown),
    ).toThrow();
  });

  it('rejects unexpected fields (strict)', () => {
    expect(() =>
      candidateDecisionSchema.parse({ action: 'confirm', id: 'x' } as unknown),
    ).toThrow();
  });

  it('rejects a missing action', () => {
    expect(() => candidateDecisionSchema.parse({} as unknown)).toThrow();
  });
});
