/**
 * Commitment Forecasting & Dashboard Summaries Feature Module
 *
 * Public API. Deterministic pure logic; persistence abstracted behind
 * `RenewalRepository` (§5.3) for a later DB adapter.
 */
export {
  FORECAST_WINDOW_DAYS,
  computeAnnualisedSen,
  computeCashFlowSummary,
  computeNext30DayTotalSen,
  computeNextPaydayDate,
  computePaydayAnalysis,
  computeSafeToSpendSen,
  computeSimulationImpact,
  countUpcoming,
  daysUntil,
  normalizeToMonthlySen,
  reminderBadge,
  sortByNextCharge,
} from './logic';
export {
  DEFAULT_REMINDER_OFFSETS,
  subscriptionToUpcomingRenewal,
} from './mapping';
export { SupabaseRenewalRepository, UPCOMING_LIMIT } from './repository';
export type {
  BillingCycle,
  CashFlowSummary,
  PaydayAnalysis,
  ReminderBadge,
  RenewalRepository,
  SimulationImpact,
  UpcomingRenewal,
} from './types';

