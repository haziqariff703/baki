-- Documented RLS policies for consents (supabase/AGENTS.md).
-- Idempotent mirror of the migration; kept here as the auditable policy record.

-- Owner-only access in all directions: (select auth.uid()) = user_id (§10.1).
-- No DELETE policy: a consent is withdrawn, never removed (§2.3).

DROP POLICY IF EXISTS "consents_select_own" ON public.consents;
CREATE POLICY "consents_select_own"
  ON public.consents FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "consents_insert_own" ON public.consents;
CREATE POLICY "consents_insert_own"
  ON public.consents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "consents_update_own" ON public.consents;
CREATE POLICY "consents_update_own"
  ON public.consents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
