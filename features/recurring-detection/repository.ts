/**
 * Supabase adapter for `RecurringCandidateRepository` (AGENTS.md §5.3, §10).
 *
 * All queries run under RLS with an explicit `user_id` filter (§10.1, §11).
 * Confirm delegates to the `confirm_recurring_candidate` RPC, which performs
 * the candidate→subscription transition atomically under a row lock (§2.2).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { ApplicationError } from '@/lib/logging';
import type { BillingCycle } from '@/features/cash-flow';
import type { Subscription } from '@/features/subscriptions';
import type {
  CandidateEdit,
  CandidateStatus,
  RecurringCandidate,
  RecurringCandidateRepository,
} from './types';

/** Row shape as stored in public.recurring_candidates (snake_case). */
interface CandidateRow {
  id: string;
  user_id: string;
  merchant_name: string;
  amount_sen: number;
  occurrence_count: number;
  interval_days: number;
  ai_confidence: string | number;
  detected_at: string;
  status: 'pending' | 'confirmed' | 'rejected';
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Subscription row shape (mirrors features/subscriptions/repository.ts). */
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

/** Map a DB row to the domain RecurringCandidate. */
function toDomain(row: CandidateRow): RecurringCandidate {
  const status: CandidateStatus =
    row.status === 'confirmed'
      ? { state: 'confirmed', confirmedAt: row.decided_at ?? row.updated_at }
      : row.status === 'rejected'
        ? { state: 'rejected', rejectedAt: row.decided_at ?? row.updated_at }
        : { state: 'pending' };
  return {
    id: row.id,
    merchantName: row.merchant_name,
    amountSen: row.amount_sen,
    occurrenceCount: row.occurrence_count,
    intervalDays: row.interval_days,
    aiConfidence: Number(row.ai_confidence),
    detectedAt: row.detected_at,
    status,
  };
}

function subscriptionToDomain(row: SubscriptionRow): Subscription {
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

function notFound(what: string): ApplicationError {
  return new ApplicationError('NOT_FOUND', `${what} not found`);
}

/**
 * Supabase-backed candidate repository. Construct with the server (anon) client
 * so RLS applies. Do NOT pass a service-role client.
 */
export class SupabaseRecurringCandidateRepository
  implements RecurringCandidateRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async list(userId: string): Promise<readonly RecurringCandidate[]> {
    const { data, error } = await this.client
      .from('recurring_candidates')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('detected_at', { ascending: false });

    if (error) throw error;
    return (data as CandidateRow[]).map(toDomain);
  }

  async get(userId: string, id: string): Promise<RecurringCandidate | null> {
    const { data, error } = await this.client
      .from('recurring_candidates')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data ? toDomain(data as CandidateRow) : null;
  }

  async reject(
    userId: string,
    id: string,
    _rejectedAt: string,
  ): Promise<RecurringCandidate> {
    void _rejectedAt; // decided_at is stamped by the DB (now()) — §2.6 traceability
    const { data, error } = await this.client
      .from('recurring_candidates')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'pending') // only pending may transition (§2.2)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound('Candidate');
    return toDomain(data as CandidateRow);
  }

  async update(
    userId: string,
    id: string,
    edit: CandidateEdit,
  ): Promise<RecurringCandidate> {
    const payload: { merchant_name?: string; amount_sen?: number } = {};
    if (edit.merchantName !== undefined) payload.merchant_name = edit.merchantName;
    if (edit.amountSen !== undefined) payload.amount_sen = edit.amountSen;

    const { data, error } = await this.client
      .from('recurring_candidates')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'pending') // only pending is editable (§2.2)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw notFound('Candidate');
    return toDomain(data as CandidateRow);
  }

  async confirm(
    userId: string,
    id: string,
    cycle: BillingCycle,
    nextChargeDate: string,
  ): Promise<Subscription> {
    const { data, error } = await this.client
      .rpc('confirm_recurring_candidate', {
        p_candidate_id: id,
        p_cycle: cycle,
        p_next_charge_date: nextChargeDate,
      });

    if (error) {
      // Map DB-raised conditions to user-safe typed errors (§14.1).
      if (error.code === 'object_not_in_prerequisite_state') {
        throw new ApplicationError(
          'VALIDATION_ERROR',
          'Candidate already decided',
        );
      }
      if (error.code === 'no_data_found') {
        throw notFound('Candidate');
      }
      throw error;
    }
    if (!data) throw notFound('Candidate');

    // RLS guarantees the returned subscription belongs to the caller; the
    // explicit check keeps the application layer honest (§11 step 3).
    const row = data as unknown as SubscriptionRow;
    if (row.user_id !== userId) {
      throw new ApplicationError('FORBIDDEN', 'Not your subscription');
    }
    return subscriptionToDomain(row);
  }

  async insertMany(
    userId: string,
    candidates: readonly Omit<RecurringCandidate, 'id' | 'status' | 'detectedAt'>[],
  ): Promise<readonly RecurringCandidate[]> {
    if (candidates.length === 0) return [];

    // Filter out candidates that already exist for this user in ANY state (pending, confirmed, or rejected)
    // or already exist as an active subscription to strictly prevent resurrecting rejected candidates (§2.2).
    const { data: existingCandidates } = await this.client
      .from('recurring_candidates')
      .select('merchant_name')
      .eq('user_id', userId);

    const { data: existingSubs } = await this.client
      .from('subscriptions')
      .select('merchant_name')
      .eq('user_id', userId);

    const existingNames = new Set([
      ...(existingCandidates ?? []).map((e: { merchant_name: string }) => e.merchant_name.toLowerCase()),
      ...(existingSubs ?? []).map((s: { merchant_name: string }) => s.merchant_name.toLowerCase()),
    ]);

    const now = new Date().toISOString();
    const rows = candidates
      .filter((c) => !existingNames.has(c.merchantName.toLowerCase()))
      .map((c) => ({
        user_id: userId,
        merchant_name: c.merchantName,
        amount_sen: c.amountSen,
        occurrence_count: c.occurrenceCount,
        interval_days: c.intervalDays,
        ai_confidence: c.aiConfidence,
        detected_at: now,
        status: 'pending' as const,
      }));

    if (rows.length === 0) return [];

    const { data, error } = await this.client
      .from('recurring_candidates')
      .insert(rows)
      .select('*');

    if (error) throw error;
    return (data as CandidateRow[]).map(toDomain);
  }
}
