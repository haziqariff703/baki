/**
 * Candidate Recurring Payment Detection Engine Feature Module
 *
 * Public API. Deterministic pure logic; persistence abstracted behind
 * `RecurringCandidateRepository` (§5.3), implemented by the Supabase adapter.
 */
export {
  applyConfirmation,
  applyEdit,
  cycleFromIntervalDays,
  deriveRecommendationHint,
  formatAmount,
  formatCadenceEvidence,
  nextChargeAfterCycle,
  toSubscription,
} from './logic';
export { detectPriceCreep } from './priceCreep';
export { SupabaseRecurringCandidateRepository } from './repository';
export type { PriceCreepEvent } from './priceCreep';
export type {
  CandidateEdit,
  CandidateStatus,
  ConfirmationDecision,
  ConfirmedSubscription,
  MoneyInSen,
  RecurringCandidate,
  RecurringCandidateRepository,
} from './types';
