/**
 * Subscriptions domain types (AGENTS.md §5.3, §8.1).
 *
 * Money is integer sen (§8.1). Ratings are 1–5 per the 5-criterion score
 * matrix (§8.2). Persistence is abstracted behind `SubscriptionRepository` so
 * the UI and use-cases never touch a concrete database client.
 */
import type { MoneyInSen } from '@/lib/money';
import type { BillingCycle } from '@/features/cash-flow';

/** A persisted active subscription with its 5 criterion ratings. */
export interface Subscription {
  readonly id: string;
  readonly merchantName: string;
  readonly amountSen: MoneyInSen;
  readonly cycle: BillingCycle;
  /** ISO 8601 UTC timestamp of the next charge. */
  readonly nextChargeDate: string;
  readonly usage: number;
  readonly necessity: number;
  readonly affordability: number;
  readonly uniqueness: number;
  readonly satisfaction: number;
  /** ISO 8601 UTC creation timestamp. */
  readonly createdAt: string;
  /** ISO 8601 UTC last-updated timestamp. */
  readonly updatedAt: string;
}

/** Input for creating a subscription (no id/timestamps). */
export type CreateSubscriptionInput = Omit<
  Subscription,
  'id' | 'createdAt' | 'updatedAt'
>;

/** Input for updating a subscription (partial). */
export type UpdateSubscriptionInput = Partial<
  Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
>;

/**
 * Repository interface for subscription persistence (§5.3). The Supabase
 * adapter implements this; the UI/use-cases depend only on this abstraction.
 */
export interface SubscriptionRepository {
  list(userId: string): Promise<readonly Subscription[]>;
  create(userId: string, input: CreateSubscriptionInput): Promise<Subscription>;
  get(userId: string, id: string): Promise<Subscription | null>;
  update(
    userId: string,
    id: string,
    input: UpdateSubscriptionInput,
  ): Promise<Subscription | null>;
  remove(userId: string, id: string): Promise<boolean>;
}
