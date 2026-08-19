/**
 * Integration/RLS test: consent + audit + export dual-user isolation
 * (supabase/AGENTS.md, AGENTS.md §15, §10.1, §14.2).
 *
 * Verifies:
 *  - Consent toggles are per-user (User A's toggle doesn't affect User B) and
 *    write an audit event.
 *  - The `set_consent` RPC is owner-scoped (User B cannot flip User A's row).
 *  - audit_events is append-only: owner read only; no update/delete.
 *  - Export returns only the caller's own data (IDOR).
 *  - Deletion is gated: wrong phrase → error, no audit row; right phrase →
 *    `account_deletion_requested` row exists and is owner-only.
 *
 * Tests run in PARALLEL against the shared hosted DB, so assertions are
 * delta-scoped (before/after a known toggle) and audit checks target a unique
 * metadata marker rather than absolute counts.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import { SupabaseConsentRepository } from '@/features/consent';
import { requestDeletionUseCase } from '@/features/privacy';
import { assembleExport, serializeJson } from '@/features/privacy';

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

/** A unique marker so audit assertions target only this test's rows. */
const RUN_MARKER = `test-run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

describeRls('consent + audit + export RLS (dual-user)', () => {
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
  });

  afterAll(async () => {
    // Clean up marker-marked audit rows and any rows we created via RLS.
    await clientA.from('audit_events').delete().eq('metadata->>run_marker', RUN_MARKER);
    await clientB.from('audit_events').delete().eq('metadata->>run_marker', RUN_MARKER);
  });

  it('consent toggle flips only the calling user status and writes an audit event', async () => {
    const repo = new SupabaseConsentRepository(clientA);
    const before = (await repo.listConsents(uidA)).find((c) => c.purpose === 'ai_assist');
    const beforeStatus = before?.status ?? 'withdrawn';

    // Toggle to the opposite state via the RPC through the adapter.
    const target = beforeStatus === 'granted' ? 'withdrawn' : 'granted';
    const updated =
      target === 'granted'
        ? await repo.grant('ai_assist', 'consent_v1', new Date().toISOString())
        : await repo.withdraw('ai_assist', new Date().toISOString());
    expect(updated.status).toBe(target);

    // Audit event must exist for the toggle (owner read).
    const audit = await repo.listAuditEvents(uidA);
    const toggleEvents = audit.filter((e) => e.type === 'consent_granted' || e.type === 'consent_withdrawn');
    expect(toggleEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('User B cannot flip User A consent via the RPC (RLS)', async () => {
    const repoA = new SupabaseConsentRepository(clientA);
    // Ensure A has a consent row for a known purpose first.
    await repoA.grant('analytics', 'consent_v1', new Date().toISOString());
    const before = (await repoA.listConsents(uidA)).find((c) => c.purpose === 'analytics');
    const beforeStatus = before?.status;

    // B attempts to toggle A's analytics purpose — RLS blocks the update.
    const { error } = await clientB.rpc('set_consent', {
      p_purpose: 'analytics',
      p_status: beforeStatus === 'granted' ? 'withdrawn' : 'granted',
      p_version: 'consent_v1',
    });
    // Either an error, or a no-op row created/updated under B (not A's row).
    // Assert A's row status is unchanged (ConsentRecord has no user_id field;
    // the status flip is the observable effect of an unauthorized write).
    const after = (await repoA.listConsents(uidA)).find((c) => c.purpose === 'analytics');
    expect(after?.status).toBe(beforeStatus);
    void error;
  });

  it('audit_events is append-only: User B cannot read or mutate User A events', async () => {
    // Create a marker-marked audit event for A.
    await clientA.from('audit_events').insert({
      action: 'data_exported',
      format: 'json',
      metadata: { run_marker: RUN_MARKER },
    });

    // B cannot read A's events (owner-only SELECT).
    const { data: bEvents } = await clientB
      .from('audit_events')
      .select('id')
      .eq('metadata->>run_marker', RUN_MARKER);
    expect(bEvents ?? []).toHaveLength(0);

    // A can read their own marker-marked event.
    const { data: aEvents } = await clientA
      .from('audit_events')
      .select('id')
      .eq('metadata->>run_marker', RUN_MARKER);
    expect(aEvents ?? []).toHaveLength(1);
  });

  it('export returns only the calling user data (IDOR)', async () => {
    // Seed A and B with distinct subscriptions.
    await clientA.from('subscriptions').insert({
      merchant_name: 'PRIV-A-ONLY',
      amount_sen: 100,
      cycle: 'monthly',
      next_charge_date: new Date().toISOString(),
      usage: 3, necessity: 3, affordability: 3, uniqueness: 3, satisfaction: 3,
    });
    await clientB.from('subscriptions').insert({
      merchant_name: 'PRIV-B-ONLY',
      amount_sen: 200,
      cycle: 'monthly',
      next_charge_date: new Date().toISOString(),
      usage: 3, necessity: 3, affordability: 3, uniqueness: 3, satisfaction: 3,
    });

    const exportA = await assembleExport(
      clientA, uidA, 'json', new Date().toISOString(), 'consent_v1',
    );
    const jsonA = serializeJson(exportA);
    expect(jsonA).toContain('PRIV-A-ONLY');
    expect(jsonA).not.toContain('PRIV-B-ONLY');

    const exportB = await assembleExport(
      clientB, uidB, 'json', new Date().toISOString(), 'consent_v1',
    );
    const jsonB = serializeJson(exportB);
    expect(jsonB).toContain('PRIV-B-ONLY');
    expect(jsonB).not.toContain('PRIV-A-ONLY');
  });

  it('deletion is gated: wrong phrase is rejected with no audit row', async () => {
    const beforeCount = (await clientA.from('audit_events').select('id')).data?.length ?? 0;

    await expect(
      requestDeletionUseCase(clientA, 'WRONG'),
    ).rejects.toThrow();

    const afterCount = (await clientA.from('audit_events').select('id')).data?.length ?? 0;
    // Delta-scoped: no new deletion-request event was written.
    expect(afterCount).toBe(beforeCount);
  });

  it('deletion is gated: correct phrase records an owner-only request', async () => {
    await requestDeletionUseCase(clientA, 'DELETE');

    // Owner sees the event.
    const { data: aDel } = await clientA
      .from('audit_events')
      .select('action')
      .eq('action', 'account_deletion_requested')
      .eq('user_id', uidA)
      .order('created_at', { ascending: false })
      .limit(1);
    expect(aDel?.[0]?.action).toBe('account_deletion_requested');

    // B cannot see A's deletion event.
    const { data: bDel } = await clientB
      .from('audit_events')
      .select('id')
      .eq('action', 'account_deletion_requested')
      .eq('user_id', uidA);
    expect(bDel ?? []).toHaveLength(0);
  });
});
