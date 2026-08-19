/**
 * Supabase adapter for `RenewalRepository` (AGENTS.md §5.3, §10).
 *
 * Reads the `subscriptions` table and projects rows to `UpcomingRenewal`.
 * Every query is scoped by `user_id` (app-layer) AND runs under RLS via the
 * anon-key server client (§10.1, §11 step 3). Only the columns the renewal
 * shape needs are selected (§10.3 — no SELECT *).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingCycle } from './types';
import type { UpcomingRenewal } from './types';
import { subscriptionToUpcomingRenewal } from './mapping';

/** Upper bound on the upcoming-renewals read (§10.3). */
export const UPCOMING_LIMIT = 200;

/** Minimal column set needed to project a subscription → renewal. */
interface RenewalRow {
  id: string;
  merchant_name: string;
  amount_sen: number;
  cycle: BillingCycle;
  next_charge_date: string;
}

/**
 * Map a snake_case row to the camelCase Subscription shape the domain
 * projection expects (AGENTS.md §5.3 adapter boundary).
 */
function toSubscriptionShape(row: RenewalRow) {
  return {
    id: row.id,
    merchantName: row.merchant_name,
    amountSen: row.amount_sen,
    cycle: row.cycle,
    nextChargeDate: row.next_charge_date,
  };
}

/**
 * Supabase-backed renewal repository. Construct with the server (anon) client
 * so RLS applies. Do NOT pass a service-role client here.
 */
export class SupabaseRenewalRepository {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * List the user's upcoming renewals with `next_charge_date >= fromDate`.
   * The DB bound prunes obviously-past rows cheaply; the domain layer still
   * applies the authoritative 30-day window via `computeCashFlowSummary` /
   * `computeNext30DayTotalSen` (defense in depth, §9).
   */
  async listUpcoming(
    userId: string,
    fromDate: string,
  ): Promise<readonly UpcomingRenewal[]> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('id, merchant_name, amount_sen, cycle, next_charge_date')
      .eq('user_id', userId)
      .gte('next_charge_date', fromDate)
      .order('next_charge_date', { ascending: true })
      .limit(UPCOMING_LIMIT);

    if (error) throw error;
    return (data as RenewalRow[]).map((row) =>
      subscriptionToUpcomingRenewal(toSubscriptionShape(row)),
    );
  }
}
