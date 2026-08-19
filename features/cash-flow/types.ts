/**
 * Cash-flow forecasting & renewal reminders — domain types (M4).
 *
 * AGENTS.md §1 core purpose, features/notifications (7d/1d/day-of), and
 * features/cash-flow. Money is integer sen (§8.1); dates are calendar-aware
 * (§9).
 */
import type { MoneyInSen } from '@/lib/money';

/** How often a subscription bills. Language-independent. */
export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** An upcoming renewal charge. */
export interface UpcomingRenewal {
  readonly id: string;
  readonly merchantName: string;
  /** Authoritative amount in integer sen. */
  readonly amountSen: MoneyInSen;
  /** Next charge date, ISO 8601 UTC. */
  readonly nextChargeDate: string;
  readonly cycle: BillingCycle;
  /** Reminder offsets in days before the charge, e.g. [7, 1, 0]. */
  readonly reminderOffsets: readonly number[];
}

/** Aggregate cash-flow summary for the dashboard. */
export interface CashFlowSummary {
  /** Sum of all subscriptions normalised to a monthly figure, integer sen. */
  readonly monthlyCommitmentSen: MoneyInSen;
  /** Monthly commitment × 12, integer sen. */
  readonly annualisedTotalSen: MoneyInSen;
  /** Available balance minus monthly commitment, integer sen. */
  readonly safeToSpendSen: MoneyInSen;
  /** Number of renewals due in the next 30 days. */
  readonly upcomingCount: number;
}

/**
 * Reminder badge for a renewal, derived from days until the charge.
 * Discriminated union so the UI pairs an icon + text label — never color
 * alone (§16).
 */
export type ReminderBadge =
  | { kind: 'day_of' }
  | { kind: 'one_day' }
  | { kind: 'seven_day' }
  | { kind: 'upcoming' };

/**
 * Result of a "what-if" savings simulation.
 * Pure deterministic calculation in integer sen.
 */
export interface SimulationImpact {
  /** Original monthly commitment before simulation, integer sen. */
  readonly originalMonthlyCommitmentSen: MoneyInSen;
  /** New simulated monthly commitment after paused subscriptions are excluded, integer sen. */
  readonly simulatedMonthlyCommitmentSen: MoneyInSen;
  /** Money saved per month, integer sen. */
  readonly monthlySavingsSen: MoneyInSen;
  /** Money saved per year (monthlySavingsSen * 12), integer sen. */
  readonly annualSavingsSen: MoneyInSen;
  /** Original safe-to-spend balance, integer sen. */
  readonly originalSafeToSpendSen: MoneyInSen;
  /** New safe-to-spend balance after savings, integer sen. */
  readonly simulatedSafeToSpendSen: MoneyInSen;
  /** Total count of subscriptions chosen to pause in this simulation. */
  readonly pausedCount: number;
}

/**
 * Result of comparing upcoming renewals against the user's monthly payday/allowance date.
 * Pure deterministic calculation in integer sen (§8.1, §9).
 */
export interface PaydayAnalysis {
  /** The target day of month (1–31) when salary/allowance arrives. */
  readonly paydayDayOfMonth: number;
  /** Next payday date, ISO 8601 UTC. */
  readonly nextPaydayDate: string;
  /** Whole calendar days until the next payday. */
  readonly daysUntilPayday: number;
  /** Total amount due before the next payday, integer sen. */
  readonly beforePaydayTotalSen: MoneyInSen;
  /** Count of renewals due before the next payday. */
  readonly beforePaydayCount: number;
  /** Total amount due on or after the next payday, integer sen. */
  readonly afterPaydayTotalSen: MoneyInSen;
  /** Count of renewals due on or after the next payday. */
  readonly afterPaydayCount: number;
  /** True if there are renewals due soon before payday. */
  readonly isTightWindow: boolean;
}

/**
 * Repository interface for renewal/cash-flow persistence (§5.3). A Supabase
 * adapter plugs in later; UI and logic depend only on this abstraction.
 *
 * `listUpcoming` is the single source-of-truth read: it returns the user's
 * upcoming renewals (projected from subscriptions). Aggregate composition
 * (summary, next-30-day total, payday analysis) is a use-case concern done
 * in the route from this list, so the repository stays a thin adapter.
 */
export interface RenewalRepository {
  listUpcoming(userId: string, fromDate: string): Promise<readonly UpcomingRenewal[]>;
}

