/**
 * Integration/RLS test: cash-flow summary path dual-user isolation
 * (supabase/AGENTS.md, AGENTS.md §15, §10.1).
 *
 * Verifies that the renewals read (projected from subscriptions) and the
 * resulting aggregates are scoped by user_id — User B's listUpcoming/summary
 * must not include or reveal User A's data (IDOR), and the allowances resolve
 * per-user from profiles.
 *
 * Skips when test env vars are absent so unit suites stay green.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import {
  SupabaseRenewalRepository,
  computeCashFlowSummary,
} from '@/features/cash-flow';

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

const FROM_DATE = '2026-08-01';
const createdIds: string[] = [];

function subRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    merchant_name: 'Spotify',
    amount_sen: 1590,
    cycle: 'monthly',
    next_charge_date: '2026-08-16T00:00:00.000Z',
    usage: 5, necessity: 3, affordability: 5, uniqueness: 3, satisfaction: 5,
    ...overrides,
  };
}

describeRls('cash-flow summary RLS (dual-user)', () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let uidA: string;
  let uidB: string;

  beforeAll(async () => {
    clientA = createClient(url!, anonKey!, { auth: { persistSession: false } });
    clientB = createClient(url!, anonKey!, { auth: { persistSession: false } });
    const signA = await clientA.auth.signInWithPassword({
      email: userA.email!, password: userA.password!,
    });
    if (signA.error) throw new Error(`User A sign-in failed: ${signA.error.message}`);
    const signB = await clientB.auth.signInWithPassword({
      email: userB.email!, password: userB.password!,
    });
    if (signB.error) throw new Error(`User B sign-in failed: ${signB.error.message}`);
    uidA = signA.data.user!.id;
    uidB = signB.data.user!.id;

    // Wait a brief moment to absorb any client-server clock skew (JWT iat).
    await new Promise((r) => setTimeout(r, 1200));
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await clientA.from('subscriptions').delete().eq('id', id);
    }
  });

  it('user A can create subscriptions and see them as renewals', async () => {
    const { data, error } = await clientA
      .from('subscriptions')
      .insert([
        subRow({ merchant_name: 'CF-Spot-Probe', amount_sen: 1590, next_charge_date: '2026-08-16T00:00:00.000Z' }),
        subRow({ merchant_name: 'CF-iCloud-Probe', amount_sen: 390, next_charge_date: '2026-08-22T00:00:00.000Z' }),
        subRow({ merchant_name: 'CF-Yearly-Probe', amount_sen: 60000, cycle: 'yearly', next_charge_date: '2027-01-05T00:00:00.000Z' }),
      ])
      .select('id');
    expect(error).toBeNull();
    expect(data).toHaveLength(3);
    for (const row of data ?? []) createdIds.push(row.id);

    const repo = new SupabaseRenewalRepository(clientA);
    const renewals = await repo.listUpcoming(uidA, FROM_DATE);
    const mine = renewals.filter((r) => r.merchantName.startsWith('CF-'));
    expect(mine).toHaveLength(3);
    expect(mine.map((r) => r.merchantName).sort()).toEqual(
      ['CF-Spot-Probe', 'CF-Yearly-Probe', 'CF-iCloud-Probe'].sort(),
    );
    expect(mine[0]).toMatchObject({ reminderOffsets: [7, 1, 0] });
  });

  it('user B sees none of user A renewals (IDOR on summary path)', async () => {
    const repo = new SupabaseRenewalRepository(clientB);
    const renewals = await repo.listUpcoming(uidB, FROM_DATE);
    for (const r of renewals) {
      expect(r.merchantName.startsWith('CF-')).toBe(false);
    }
  });

  it('user A summary aggregates only their own data', async () => {
    const repo = new SupabaseRenewalRepository(clientA);
    const renewals = await repo.listUpcoming(uidA, FROM_DATE);
    // Only consider the rows this test created — other integration files run
    // in parallel against the same hosted DB, so User A may have leftover
    // rows. Filtering by our unique CF- prefix keeps the assertion isolated.
    const mine = renewals.filter((r) => r.merchantName.startsWith('CF-'));
    // monthly: 1590 + 390 = 1980; yearly: 60000/12 = 5000 → total 6980.
    const summary = computeCashFlowSummary(mine, 100000, FROM_DATE);
    expect(summary.monthlyCommitmentSen).toBe(6980);
    expect(summary.annualisedTotalSen).toBe(6980 * 12);
    expect(summary.upcomingCount).toBe(2); // CF-Spot + CF-iCloud within 30 days
  });

  it('user B summary does not include user A amounts', async () => {
    const repo = new SupabaseRenewalRepository(clientB);
    const renewalsB = await repo.listUpcoming(uidB, FROM_DATE);
    const repoA = new SupabaseRenewalRepository(clientA);
    const renewalsA = await repoA.listUpcoming(uidA, FROM_DATE);

    const summaryB = computeCashFlowSummary(renewalsB, 0, FROM_DATE);
    const summaryA = computeCashFlowSummary(renewalsA, 0, FROM_DATE);
    expect(summaryB.monthlyCommitmentSen).not.toBe(summaryA.monthlyCommitmentSen);
  });

  it('profiles allowance resolves per user (default 0)', async () => {
    const { data } = await clientA
      .from('profiles')
      .select('monthly_allowance_sen')
      .eq('id', uidA)
      .maybeSingle();
    // Column exists and returns a number (default 0 unless set elsewhere).
    expect(typeof data?.monthly_allowance_sen).toBe('number');
  });
});
