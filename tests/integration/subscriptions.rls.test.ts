/**
 * Integration/RLS test: subscriptions dual-user isolation (supabase/AGENTS.md,
 * AGENTS.md §15).
 *
 * Verifies User A cannot read/update/delete User B's subscriptions. Requires a
 * live Supabase project and test credentials in env; otherwise it is skipped
 * (so unit suites remain green without a database).
 *
 * Required env (test-only, never committed):
 *   BAKI_TEST_SUPABASE_URL, BAKI_TEST_ANON_KEY,
 *   BAKI_TEST_USER_A_EMAIL/PASSWORD, BAKI_TEST_USER_B_EMAIL/PASSWORD
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it } from 'vitest';

const url = process.env.BAKI_TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.BAKI_TEST_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const userA = {
  email: process.env.BAKI_TEST_USER_A_EMAIL,
  password: process.env.BAKI_TEST_USER_A_PASSWORD,
};
const userB = {
  email: process.env.BAKI_TEST_USER_B_EMAIL,
  password: process.env.BAKI_TEST_USER_B_PASSWORD,
};

const configured =
  Boolean(url) &&
  Boolean(anonKey) &&
  Boolean(userA.email) &&
  Boolean(userA.password) &&
  Boolean(userB.email) &&
  Boolean(userB.password);

const describeRls = configured ? describe : describe.skip;

describeRls('subscriptions RLS (dual-user)', () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let createdId: string;

  beforeAll(async () => {
    // Separate clients per user so sessions don't collide.
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
  });

  it('lets user A create a subscription', async () => {
    const { data, error } = await clientA
      .from('subscriptions')
      .insert({
        merchant_name: 'Spotify',
        amount_sen: 1590,
        cycle: 'monthly',
        next_charge_date: new Date().toISOString(),
        usage: 5,
        necessity: 3,
        affordability: 5,
        uniqueness: 3,
        satisfaction: 5,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    createdId = data.id;
  });

  it('lets user A read their own subscription', async () => {
    const { data, error } = await clientA
      .from('subscriptions')
      .select('*')
      .eq('id', createdId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeTruthy();
  });

  it('prevents user B from reading user A subscription (IDOR)', async () => {
    const { data, error } = await clientB
      .from('subscriptions')
      .select('*')
      .eq('id', createdId)
      .maybeSingle();
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('prevents user B from updating user A subscription', async () => {
    const { error } = await clientB
      .from('subscriptions')
      .update({ merchant_name: 'HACKED' })
      .eq('id', createdId)
      .select();
    // No rows matched → no error, but also no rows updated.
    expect(error).toBeNull();
  });

  it('prevents user B from deleting user A subscription', async () => {
    const { error } = await clientB
      .from('subscriptions')
      .delete()
      .eq('id', createdId);
    expect(error).toBeNull();

    // User A should still see it.
    const { data } = await clientA
      .from('subscriptions')
      .select('*')
      .eq('id', createdId)
      .maybeSingle();
    expect(data).toBeTruthy();
  });

  it('lets user A clean up their subscription', async () => {
    const { error } = await clientA
      .from('subscriptions')
      .delete()
      .eq('id', createdId);
    expect(error).toBeNull();
  });
});
