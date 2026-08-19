/**
 * Supabase adapter for `SubscriptionRepository` (AGENTS.md §5.3, §10).
 *
 * Every query is scoped by `user_id = auth.uid()` via RLS; the adapter also
 * passes the explicit `user_id` filter so ownership is enforced at both the
 * application and database layers (§10.1, §11 step 3).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CreateSubscriptionInput,
  Subscription,
  SubscriptionRepository,
  UpdateSubscriptionInput,
} from './types';

/** Row shape as stored in public.subscriptions (snake_case). */
interface SubscriptionRow {
  id: string;
  user_id: string;
  merchant_name: string;
  amount_sen: number;
  cycle: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_charge_date: string;
  usage: number;
  necessity: number;
  affordability: number;
  uniqueness: number;
  satisfaction: number;
  created_at: string;
  updated_at: string;
}

/** Map a database row to the domain entity. */
function toDomain(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    merchantName: row.merchant_name,
    amountSen: row.amount_sen,
    cycle: row.cycle,
    nextChargeDate: row.next_charge_date,
    usage: row.usage,
    necessity: row.necessity,
    affordability: row.affordability,
    uniqueness: row.uniqueness,
    satisfaction: row.satisfaction,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Map domain input to the snake_case insert payload. */
function toRow(
  input: CreateSubscriptionInput,
): Omit<SubscriptionRow, 'id' | 'user_id' | 'created_at' | 'updated_at'> {
  return {
    merchant_name: input.merchantName,
    amount_sen: input.amountSen,
    cycle: input.cycle,
    next_charge_date: input.nextChargeDate,
    usage: input.usage,
    necessity: input.necessity,
    affordability: input.affordability,
    uniqueness: input.uniqueness,
    satisfaction: input.satisfaction,
  };
}

/** Map a partial update to snake_case fields (only present keys). */
function toUpdateRow(input: UpdateSubscriptionInput): Partial<
  Omit<SubscriptionRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>
> {
  const out: Partial<
    Omit<SubscriptionRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  > = {};
  if (input.merchantName !== undefined) out.merchant_name = input.merchantName;
  if (input.amountSen !== undefined) out.amount_sen = input.amountSen;
  if (input.cycle !== undefined) out.cycle = input.cycle;
  if (input.nextChargeDate !== undefined) out.next_charge_date = input.nextChargeDate;
  if (input.usage !== undefined) out.usage = input.usage;
  if (input.necessity !== undefined) out.necessity = input.necessity;
  if (input.affordability !== undefined) out.affordability = input.affordability;
  if (input.uniqueness !== undefined) out.uniqueness = input.uniqueness;
  if (input.satisfaction !== undefined) out.satisfaction = input.satisfaction;
  return out;
}

/**
 * Supabase-backed subscription repository. Construct with a server client
 * (anon key) so RLS applies. Do NOT pass a service-role client here.
 */
export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(userId: string): Promise<readonly Subscription[]> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('next_charge_date', { ascending: true });

    if (error) throw error;
    return (data as SubscriptionRow[]).map(toDomain);
  }

  async create(
    userId: string,
    input: CreateSubscriptionInput,
  ): Promise<Subscription> {
    const { data, error } = await this.client
      .from('subscriptions')
      .insert({ user_id: userId, ...toRow(input) })
      .select()
      .single();

    if (error) throw error;
    return toDomain(data as SubscriptionRow);
  }

  async get(userId: string, id: string): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? toDomain(data as SubscriptionRow) : null;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateSubscriptionInput,
  ): Promise<Subscription | null> {
    const { data, error } = await this.client
      .from('subscriptions')
      .update(toUpdateRow(input))
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return data ? toDomain(data as SubscriptionRow) : null;
  }

  async remove(userId: string, id: string): Promise<boolean> {
    const { error } = await this.client
      .from('subscriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }
}
