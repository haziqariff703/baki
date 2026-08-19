/**
 * Pure mapping from a persisted Subscription to an UpcomingRenewal (AGENTS.md §5.3).
 *
 * The cash-flow feature consumes `UpcomingRenewal` (a renewal-forecast shape),
 * while the physical data is the `subscriptions` table. This adapter maps one
 * to the other, deterministically (§2.1) and without any framework imports.
 */
import type { Subscription } from '@/features/subscriptions';
import type { UpcomingRenewal } from './types';

/**
 * Reminder offsets (days before a charge) for all renewals.
 *
 * Single, versioned source of truth matching the notifications feature's
 * 7d / 1d / day-of spec (§1) and all fixtures/tests. Kept as a constant so it
 * is centralised and auditable rather than scattered.
 */
export const DEFAULT_REMINDER_OFFSETS: readonly number[] = [7, 1, 0];

/**
 * The subset of a Subscription the renewal projection reads. Declared as a
 * Pick so the adapter can map a lean DB row (no rating columns) straight into
 * this shape without fabricating fields it never uses.
 */
export type SubscriptionForRenewal = Pick<
  Subscription,
  'id' | 'merchantName' | 'amountSen' | 'cycle' | 'nextChargeDate'
>;

/**
 * Project a subscription into an upcoming renewal for forecasting.
 * Pure and deterministic — same input always yields the same output (§2.1).
 * Returns a new object; never mutates the input.
 */
export function subscriptionToUpcomingRenewal(
  subscription: SubscriptionForRenewal,
): UpcomingRenewal {
  return {
    id: subscription.id,
    merchantName: subscription.merchantName,
    amountSen: subscription.amountSen,
    cycle: subscription.cycle,
    nextChargeDate: subscription.nextChargeDate,
    reminderOffsets: DEFAULT_REMINDER_OFFSETS,
  };
}
