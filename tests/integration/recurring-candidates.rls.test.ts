/**
 * Integration/RLS test: recurring_candidates dual-user isolation + the atomic
 * confirm RPC (supabase/AGENTS.md, AGENTS.md §15, §2.2).
 *
 * Verifies:
 *  - User B cannot read/update/delete User A's candidates (IDOR).
 *  - Confirm runs atomically: candidate flips to 'confirmed' AND a
 *    subscription row appears with identical merchant/amount.
 *  - Confirm is one-shot: a second confirm is rejected.
 *  - Rejected candidates cannot be confirmed afterwards.
 *
 * Skips when test env vars are absent so unit suites stay green.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

const url = process.env.BAKI_TEST_SUPABASE_URL;
const anonKey = process.env.BAKI_TEST_ANON_KEY;
const userA = {
  email: process.env.BAKI_TEST_USER_A_EMAIL,
  password: process.env.BAKI_TEST_USER_A_PASSWORD,
};
const userB = {
  email: process.env.BAKI_TEST_USER_B_EMAIL,
  password: process.env.BAKI_TEST_USER_B_PASSWORD,
};

const configured =
  process.env.BAKI_TEST_RUN_RLS === 'true' &&
  Boolean(url) &&
  Boolean(anonKey) &&
  Boolean(userA.email) &&
  Boolean(userA.password) &&
  Boolean(userB.email) &&
  Boolean(userB.password);

const describeRls = configured ? describe : describe.skip;

/** Cleanup helper: remove test rows created during the run. */
const createdCandidateIds: string[] = [];
const createdSubscriptionIds: string[] = [];

describeRls('recurring_candidates RLS + confirm RPC (dual-user)', () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;

  beforeAll(async () => {
    clientA = createClient(url!, anonKey!, { auth: { persistSession: false } });
    clientB = createClient(url!, anonKey!, { auth: { persistSession: false } });
    // Fail loudly on bad credentials — never silently run unauthenticated.
    const signA = await clientA.auth.signInWithPassword({
      email: userA.email!,
      password: userA.password!,
    });
    if (signA.error) throw new Error(`User A sign-in failed: ${signA.error.message}`);
    const signB = await clientB.auth.signInWithPassword({
      email: userB.email!,
      password: userB.password!,
    });
    if (signB.error) throw new Error(`User B sign-in failed: ${signB.error.message}`);

    // Wait a brief moment to absorb any client-server clock skew (JWT iat).
    await new Promise((r) => setTimeout(r, 1200));
  });

  afterAll(async () => {
    for (const id of createdSubscriptionIds) {
      await clientA.from('subscriptions').delete().eq('id', id);
    }
    for (const id of createdCandidateIds) {
      await clientA.from('recurring_candidates').delete().eq('id', id);
    }
  });

  async function seedCandidate(client: SupabaseClient): Promise<string> {
    const { data, error } = await client
      .from('recurring_candidates')
      .insert({
        merchant_name: 'Spotify',
        amount_sen: 1590,
        occurrence_count: 4,
        interval_days: 30,
        ai_confidence: 0.92,
        detected_at: '2026-07-28T02:14:00.000Z',
      })
      .select()
      .single();
    expect(error).toBeNull();
    createdCandidateIds.push(data.id);
    return data.id;
  }

  it('User A can create and read their own candidate', async () => {
    const id = await seedCandidate(clientA);
    const { data, error } = await clientA
      .from('recurring_candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data?.status).toBe('pending');
  });

  it('User B cannot read User A candidate (IDOR)', async () => {
    const id = await seedCandidate(clientA);
    const { data, error } = await clientB
      .from('recurring_candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('User B cannot update User A candidate', async () => {
    const id = await seedCandidate(clientA);
    const { error } = await clientB
      .from('recurring_candidates')
      .update({ merchant_name: 'HACKED' })
      .eq('id', id)
      .select();
    expect(error).toBeNull();

    const { data } = await clientA
      .from('recurring_candidates')
      .select('merchant_name')
      .eq('id', id)
      .single();
    expect(data?.merchant_name).toBe('Spotify');
  });

  it('User B cannot delete User A candidate', async () => {
    const id = await seedCandidate(clientA);
    const { error } = await clientB
      .from('recurring_candidates')
      .delete()
      .eq('id', id);
    expect(error).toBeNull();

    const { data } = await clientA
      .from('recurring_candidates')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    expect(data).not.toBeNull();
  });

  it('confirm RPC atomically confirms candidate + creates subscription', async () => {
    const id = await seedCandidate(clientA);

    const { data: sub, error } = await clientA.rpc('confirm_recurring_candidate', {
      p_candidate_id: id,
      p_cycle: 'monthly',
      p_next_charge_date: '2026-08-28T02:14:00.000Z',
    });
    expect(error).toBeNull();
    expect(sub).toBeTruthy();
    createdSubscriptionIds.push(sub.id);

    // Subscription carries the candidate's authoritative fields.
    expect(sub.merchant_name).toBe('Spotify');
    expect(sub.amount_sen).toBe(1590);
    expect(sub.cycle).toBe('monthly');
    expect(sub.usage).toBe(3); // neutral default rating

    // Candidate is now confirmed, terminal.
    const { data: cand } = await clientA
      .from('recurring_candidates')
      .select('status, decided_at')
      .eq('id', id)
      .single();
    expect(cand?.status).toBe('confirmed');
    expect(cand?.decided_at).not.toBeNull();
  });

  it('confirm is one-shot: second confirm is rejected', async () => {
    const id = await seedCandidate(clientA);
    const first = await clientA.rpc('confirm_recurring_candidate', {
      p_candidate_id: id,
      p_cycle: 'monthly',
      p_next_charge_date: '2026-08-28T02:14:00.000Z',
    });
    expect(first.error).toBeNull();
    createdSubscriptionIds.push(first.data.id);

    const second = await clientA.rpc('confirm_recurring_candidate', {
      p_candidate_id: id,
      p_cycle: 'monthly',
      p_next_charge_date: '2026-09-28T02:14:00.000Z',
    });
    expect(second.error).toBeTruthy();
    expect(second.error?.code ?? second.error?.message).toBeTruthy();
  });

  it('rejected candidates cannot be confirmed afterwards', async () => {
    const id = await seedCandidate(clientA);
    const { error } = await clientA
      .from('recurring_candidates')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select();
    expect(error).toBeNull();

    const rpc = await clientA.rpc('confirm_recurring_candidate', {
      p_candidate_id: id,
      p_cycle: 'monthly',
      p_next_charge_date: '2026-08-28T02:14:00.000Z',
    });
    expect(rpc.error).toBeTruthy();
  });

  it('User B cannot confirm User A candidate via RPC (RLS)', async () => {
    const id = await seedCandidate(clientA);
    const rpc = await clientB.rpc('confirm_recurring_candidate', {
      p_candidate_id: id,
      p_cycle: 'monthly',
      p_next_charge_date: '2026-08-28T02:14:00.000Z',
    });
    expect(rpc.error).toBeTruthy();

    // Candidate must remain pending for User A.
    const { data } = await clientA
      .from('recurring_candidates')
      .select('status')
      .eq('id', id)
      .single();
    expect(data?.status).toBe('pending');
  });

  it('reject marks a pending candidate terminal', async () => {
    const id = await seedCandidate(clientA);
    const { data, error } = await clientA
      .from('recurring_candidates')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.status).toBe('rejected');
    expect(data?.decided_at).not.toBeNull();
  });
});
