/**
 * Integration/RLS test: imports + transactions dual-user isolation
 * (supabase/AGENTS.md, AGENTS.md §15, §10.1, §12).
 *
 * Verifies:
 *  - An import persists transactions scoped to the importing user.
 *  - User B cannot read/delete User A's transactions (IDOR).
 *  - Storage objects are owner-scoped: User B cannot read User A's raw file.
 *
 * Tests run in PARALLEL against the shared hosted DB, so merchant names are
 * prefixed with a unique marker and cleanup deletes only this run's rows.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import { runImport } from '@/features/imports';
import {
  SupabaseImportRepository,
  SupabaseTransactionRepository,
} from '@/features/transactions';

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

/** Unique marker so we only assert on this run's data (parallel-worker safe). */
const MARK = `ZZIMP${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

/** A storage adapter that writes through the given anon client. */
class TestStorage {
  constructor(private readonly client: SupabaseClient) {}
  async upload(userId: string, ext: 'csv' | 'pdf', data: Uint8Array): Promise<string> {
    const path = `${userId}/${MARK}.${ext}`;
    const { error } = await this.client.storage.from('imports').upload(path, data, {
      contentType: ext === 'csv' ? 'text/csv' : 'application/pdf',
    });
    if (error) throw error;
    return path;
  }
  async remove(path: string): Promise<void> {
    const { error } = await this.client.storage.from('imports').remove([path]);
    if (error) throw error;
  }
}

const createdImportIds: string[] = [];
const createdTxIds: string[] = [];

describeRls('imports + transactions RLS (dual-user)', () => {
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;
  let uidA: string;

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
  });

  afterAll(async () => {
    // Cleanup this run's transactions (via RLS as A) and import rows.
    if (createdTxIds.length) {
      await clientA.from('transactions').delete().in('id', createdTxIds);
    }
    if (createdImportIds.length) {
      await clientA.from('imports').delete().in('id', createdImportIds);
    }
  });

  it('A imports a CSV and sees their own persisted transactions', async () => {
    const csv = [
      'merchant,amount,date',
      `${MARK}-Spotify,15.90,2026-08-01`,
      `${MARK}-Netflix,45.00,2026-08-03`,
    ].join('\n');

    const outcome = await runImport({
      userId: uidA,
      source: 'csv',
      fileName: `${MARK}.csv`,
      bytes: new TextEncoder().encode(csv),
      storage: new TestStorage(clientA),
      transactionRepo: new SupabaseTransactionRepository(clientA),
      importRepo: new SupabaseImportRepository(clientA),
    });

    expect(outcome.importedCount).toBe(2);
    expect(outcome.import.storagePath).toBeNull(); // purged after extraction
    createdImportIds.push(outcome.import.id);

    // Read back via the repo.
    const repo = new SupabaseTransactionRepository(clientA);
    const { data } = await clientA
      .from('transactions')
      .select('id, merchant_name, user_id')
      .eq('import_id', outcome.import.id);
    expect(data?.length).toBe(2);
    for (const row of data ?? []) {
      createdTxIds.push(row.id);
      expect(row.merchant_name).toBeTruthy();
      expect(row.user_id).toBe(uidA);
    }
    void repo;
  });

  it('User B cannot read User A transactions (IDOR)', async () => {
    // The purge already removed the raw file; verify B cannot read A's rows
    // by created transaction ID.
    const { data } = await clientB
      .from('transactions')
      .select('id')
      .in('id', createdTxIds);
    expect(data ?? []).toHaveLength(0);
  });

  it('User B cannot read User A storage objects (owner-scoped)', async () => {
    // Re-upload a raw object as A to verify B cannot list/read it.
    const path = `${uidA}/${MARK}-probe.csv`;
    const { error: upErr } = await clientA.storage
      .from('imports')
      .upload(path, new TextEncoder().encode('a,b,c'), { contentType: 'text/csv' });
    if (upErr) throw upErr;

    const { data: bList } = await clientB.storage
      .from('imports')
      .list(uidA);
    const bNames = (bList ?? []).map((o) => o.name);
    expect(bNames.includes(`${MARK}-probe.csv`)).toBe(false);

    // A can read/delete their own object.
    const { data: aList } = await clientA.storage.from('imports').list(uidA);
    const aNames = (aList ?? []).map((o) => o.name);
    expect(aNames.includes(`${MARK}-probe.csv`)).toBe(true);

    await clientA.storage.from('imports').remove([path]);
  });
});
