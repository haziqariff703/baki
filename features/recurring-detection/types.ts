/**
 * Recurring-payment candidate detection — domain types.
 *
 * AGENTS.md §2.2 (Human-Controlled Decisions): every detected candidate must
 * be explicitly confirmed or rejected by the user before it becomes an active
 * subscription. These types model that lifecycle and keep the confirmation
 * status traceable (§2.6).
 */
import type { BillingCycle } from '@/features/cash-flow';
import type { Subscription } from '@/features/subscriptions';

/**
 * Money in sen — integer, authoritative (AGENTS.md §8.1).
 * RM 15.90 is stored as 1590. Never a float.
 */
export type MoneyInSen = number;

/**
 * Discriminated union for candidate status. Language-independent codes;
 * the UI maps them to localized stamps (§16).
 */
export type CandidateStatus =
  | { state: 'pending' }
  | { state: 'confirmed'; confirmedAt: string /* ISO UTC */ }
  | { state: 'rejected'; rejectedAt: string /* ISO UTC */ };

/** A detected recurring-payment candidate awaiting human review. */
export interface RecurringCandidate {
  readonly id: string;
  /** Normalised merchant name, e.g. "Spotify". */
  readonly merchantName: string;
  /** Authoritative amount in integer sen. */
  readonly amountSen: MoneyInSen;
  /** How many times this charge was observed. */
  readonly occurrenceCount: number;
  /** Approximate interval between charges, in days. */
  readonly intervalDays: number;
  /** AI confidence, 0–1 (advisory only — never auto-approves, §13.1). */
  readonly aiConfidence: number;
  /** When the candidate was detected, ISO 8601 UTC. */
  readonly detectedAt: string;
  /** Current lifecycle state. */
  readonly status: CandidateStatus;
}

/** A candidate that has been confirmed into an active subscription. */
export interface ConfirmedSubscription {
  readonly id: string;
  readonly merchantName: string;
  readonly amountSen: MoneyInSen;
  readonly intervalDays: number;
  readonly confirmedAt: string;
}

/** The user's decision on a candidate (§2.2). */
export type ConfirmationDecision =
  | { action: 'confirm'; confirmedAt: string }
  | { action: 'reject'; rejectedAt: string };

/** Editable fields before confirming (merchant / amount). */
export interface CandidateEdit {
  readonly merchantName?: string;
  readonly amountSen?: MoneyInSen;
}

/**
 * Repository interface for candidate persistence (AGENTS.md §5.3).
 * The DB adapter (Supabase) implements this; the UI and logic depend only on
 * this abstraction, never on a concrete database client.
 */
export interface RecurringCandidateRepository {
  list(userId: string): Promise<readonly RecurringCandidate[]>;
  /** Fetch one candidate (RLS-scoped). Null when absent or not owned. */
  get(userId: string, id: string): Promise<RecurringCandidate | null>;
  /** Reject a pending candidate (terminal). Throws NOT_FOUND when absent. */
  reject(userId: string, id: string, rejectedAt: string): Promise<RecurringCandidate>;
  /** Update a pending candidate's merchant/amount (pre-decision edit). */
  update(userId: string, id: string, edit: CandidateEdit): Promise<RecurringCandidate>;
  /**
   * Atomically confirm a pending candidate and create the active
   * subscription (§2.2). `cycle` and `nextChargeDate` are derived
   * deterministically by the caller (§2.1). Throws NOT_FOUND when absent.
   */
  confirm(
    userId: string,
    id: string,
    cycle: BillingCycle,
    nextChargeDate: string,
  ): Promise<Subscription>;

  /** Insert newly detected candidates (§2.1). */
  insertMany(
    userId: string,
    candidates: readonly Omit<RecurringCandidate, 'id' | 'status' | 'detectedAt'>[],
  ): Promise<readonly RecurringCandidate[]>;
}
