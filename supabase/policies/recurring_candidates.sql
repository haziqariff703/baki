-- Documented RLS policies for recurring_candidates (supabase/AGENTS.md).
-- Idempotent mirror of the migration; kept here as the auditable policy record.

-- Owner-only access in all directions: (select auth.uid()) = user_id (§10.1).
-- Dual-user verification: tests/integration/recurring-candidates.rls.test.ts
-- proves User A cannot read/update/delete User B's candidates, and that the
-- confirm RPC refuses to confirm another user's candidate (IDOR protection).

DROP POLICY IF EXISTS "recurring_candidates_select_own" ON public.recurring_candidates;
CREATE POLICY "recurring_candidates_select_own"
  ON public.recurring_candidates FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurring_candidates_insert_own" ON public.recurring_candidates;
CREATE POLICY "recurring_candidates_insert_own"
  ON public.recurring_candidates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurring_candidates_update_own" ON public.recurring_candidates;
CREATE POLICY "recurring_candidates_update_own"
  ON public.recurring_candidates FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "recurring_candidates_delete_own" ON public.recurring_candidates;
CREATE POLICY "recurring_candidates_delete_own"
  ON public.recurring_candidates FOR DELETE
  USING (auth.uid() = user_id);
