/**
 * Pure deterministic cash-flow logic (M4).
 *
 * AGENTS.md §2.1: same input → same output, no LLM. §8.1: integer sen only.
 * §9: calendar-aware dates — month normalisation uses documented conversion
 * rules, never fixed-millisecond arithmetic.
 */
import { daysUntil as daysUntilDate } from '@/lib/dates';
import type { MoneyInSen } from '@/lib/money';
import type {
  BillingCycle,
  CashFlowSummary,
  PaydayAnalysis,
  ReminderBadge,
  SimulationImpact,
  UpcomingRenewal,
} from './types';

/** Window for the "next 30 days" forecast. */
export const FORECAST_WINDOW_DAYS = 30;

/**
 * Normalise one charge to a monthly sen figure (integer, no floats).
 *
 * Conversion rules (documented, deterministic, calendar-aware per §9):
 * - monthly   → the amount as-is.
 * - yearly    → amount / 12, rounded to the nearest sen.
 * - quarterly → amount / 3, rounded to the nearest sen (a quarter = 3 months).
 * - weekly    → amount × 52 / 12 (52 weeks per calendar year spread over 12
 *               months), rounded to the nearest sen. We deliberately use the
 *               52-week year rather than `× 30 / 7` to stay calendar-based.
 */
export function normalizeToMonthlySen(
  amountSen: MoneyInSen,
  cycle: BillingCycle,
): MoneyInSen {
  switch (cycle) {
    case 'monthly':
      return amountSen;
    case 'yearly':
      return Math.round(amountSen / 12);
    case 'quarterly':
      return Math.round(amountSen / 3);
    case 'weekly':
      return Math.round((amountSen * 52) / 12);
  }
}

/** Annualised total from a monthly commitment (integer sen). */
export function computeAnnualisedSen(monthlyCommitmentSen: MoneyInSen): MoneyInSen {
  return monthlyCommitmentSen * 12;
}

/** Whole calendar days until a renewal (delegates to calendar-aware lib). */
export function daysUntil(nextChargeDate: string, fromDate: string): number | null {
  return daysUntilDate(nextChargeDate, fromDate);
}

/**
 * Total of renewals due within `FORECAST_WINDOW_DAYS` of `fromDate`
 * (inclusive of the window edge), integer sen.
 */
export function computeNext30DayTotalSen(
  renewals: readonly UpcomingRenewal[],
  fromDate: string,
): MoneyInSen {
  return renewals
    .filter((r) => {
      const d = daysUntil(r.nextChargeDate, fromDate);
      return d !== null && d >= 0 && d <= FORECAST_WINDOW_DAYS;
    })
    .reduce((sum, r) => sum + r.amountSen, 0);
}

/** Count renewals due within the forecast window. */
export function countUpcoming(
  renewals: readonly UpcomingRenewal[],
  fromDate: string,
): number {
  return renewals.filter((r) => {
    const d = daysUntil(r.nextChargeDate, fromDate);
    return d !== null && d >= 0 && d <= FORECAST_WINDOW_DAYS;
  }).length;
}

/** Reminder badge for a given days-until value (§16: icon+text, not color). */
export function reminderBadge(days: number | null): ReminderBadge {
  if (days === 0) return { kind: 'day_of' };
  if (days === 1) return { kind: 'one_day' };
  if (days !== null && days <= 7) return { kind: 'seven_day' };
  return { kind: 'upcoming' };
}

/** Safe-to-spend = available balance minus monthly commitment (integer sen). */
export function computeSafeToSpendSen(
  availableBalanceSen: MoneyInSen,
  monthlyCommitmentSen: MoneyInSen,
): MoneyInSen {
  return availableBalanceSen - monthlyCommitmentSen;
}

/** Assemble the full dashboard summary deterministically. */
export function computeCashFlowSummary(
  renewals: readonly UpcomingRenewal[],
  availableBalanceSen: MoneyInSen,
  fromDate: string,
): CashFlowSummary {
  const monthlyCommitmentSen = renewals.reduce(
    (sum, r) => sum + normalizeToMonthlySen(r.amountSen, r.cycle),
    0,
  );
  return {
    monthlyCommitmentSen,
    annualisedTotalSen: computeAnnualisedSen(monthlyCommitmentSen),
    safeToSpendSen: computeSafeToSpendSen(availableBalanceSen, monthlyCommitmentSen),
    upcomingCount: countUpcoming(renewals, fromDate),
  };
}

/** Sort renewals by next charge date ascending (deterministic). */
export function sortByNextCharge(
  renewals: readonly UpcomingRenewal[],
): readonly UpcomingRenewal[] {
  return [...renewals].sort((a, b) =>
    a.nextChargeDate.localeCompare(b.nextChargeDate),
  );
}

/**
 * Compute the impact of pausing a set of subscriptions in a simulation.
 * Pure deterministic calculation in integer sen (§8.1, §2.1).
 */
export function computeSimulationImpact(
  renewals: readonly UpcomingRenewal[],
  pausedIds: ReadonlySet<string> | readonly string[],
  availableBalanceSen: MoneyInSen,
): SimulationImpact {
  const pausedSet = pausedIds instanceof Set ? pausedIds : new Set(pausedIds);

  let originalMonthlyCommitmentSen = 0;
  let simulatedMonthlyCommitmentSen = 0;
  let pausedCount = 0;

  for (const r of renewals) {
    const monthlySen = normalizeToMonthlySen(r.amountSen, r.cycle);
    originalMonthlyCommitmentSen += monthlySen;
    if (pausedSet.has(r.id)) {
      pausedCount += 1;
    } else {
      simulatedMonthlyCommitmentSen += monthlySen;
    }
  }

  const monthlySavingsSen = originalMonthlyCommitmentSen - simulatedMonthlyCommitmentSen;
  const annualSavingsSen = computeAnnualisedSen(monthlySavingsSen);
  const originalSafeToSpendSen = computeSafeToSpendSen(availableBalanceSen, originalMonthlyCommitmentSen);
  const simulatedSafeToSpendSen = computeSafeToSpendSen(availableBalanceSen, simulatedMonthlyCommitmentSen);

  return {
    originalMonthlyCommitmentSen,
    simulatedMonthlyCommitmentSen,
    monthlySavingsSen,
    annualSavingsSen,
    originalSafeToSpendSen,
    simulatedSafeToSpendSen,
    pausedCount,
  };
}

/**
 * Compute the next occurrence of a day-of-month (1–31) from a reference date.
 * Calendar-aware: clamps to the last day of the month if the month has fewer days
 * (e.g. 31st on February 2026 resolves to 2026-02-28).
 */
export function computeNextPaydayDate(dayOfMonth: number, fromDate: string): string {
  const from = new Date(fromDate);
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const currentDay = from.getUTCDate();

  const getClampedDate = (y: number, m: number, targetDay: number): Date => {
    // Last day of month m in year y
    const lastDayOfMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const clampedDay = Math.min(Math.max(1, targetDay), lastDayOfMonth);
    return new Date(Date.UTC(y, m, clampedDay));
  };

  // Check this month's target date
  const thisMonthPayday = getClampedDate(year, month, dayOfMonth);
  if (thisMonthPayday.getUTCDate() >= currentDay) {
    return thisMonthPayday.toISOString();
  }

  // Otherwise target date in next month
  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  return getClampedDate(nextMonthYear, nextMonth, dayOfMonth).toISOString();
}

/**
 * Deterministic analysis of commitments relative to the user's next payday / allowance.
 * Pure integer sen calculation (§8.1, §9).
 */
export function computePaydayAnalysis(
  renewals: readonly UpcomingRenewal[],
  paydayDayOfMonth: number,
  fromDate: string,
): PaydayAnalysis {
  const nextPaydayDate = computeNextPaydayDate(paydayDayOfMonth, fromDate);
  const daysUntilPayday = daysUntil(nextPaydayDate, fromDate) ?? 0;

  let beforePaydayTotalSen = 0;
  let beforePaydayCount = 0;
  let afterPaydayTotalSen = 0;
  let afterPaydayCount = 0;

  for (const r of renewals) {
    const d = daysUntil(r.nextChargeDate, fromDate);
    // Only consider renewals within the 30-day forecast window
    if (d !== null && d >= 0 && d <= FORECAST_WINDOW_DAYS) {
      const daysToPaydayFromCharge = daysUntil(r.nextChargeDate, nextPaydayDate);
      if (daysToPaydayFromCharge !== null && daysToPaydayFromCharge < 0) {
        beforePaydayTotalSen += r.amountSen;
        beforePaydayCount += 1;
      } else {
        afterPaydayTotalSen += r.amountSen;
        afterPaydayCount += 1;
      }
    }
  }

  const isTightWindow = beforePaydayTotalSen > 0 && daysUntilPayday <= 14;

  return {
    paydayDayOfMonth,
    nextPaydayDate,
    daysUntilPayday,
    beforePaydayTotalSen,
    beforePaydayCount,
    afterPaydayTotalSen,
    afterPaydayCount,
    isTightWindow,
  };
}


