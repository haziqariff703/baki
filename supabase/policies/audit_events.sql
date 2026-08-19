-- Documented RLS policies for audit_events (supabase/AGENTS.md).
-- Idempotent mirror of the migration; kept here as the auditable policy record.

-- Append-only: owner SELECT + INSERT only. No UPDATE, no DELETE (§14.2) —
-- an audit event is immutable evidence of an action.

DROP POLICY IF EXISTS "audit_events_select_own" ON public.audit_events;
CREATE POLICY "audit_events_select_own"
  ON public.audit_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "audit_events_insert_own" ON public.audit_events;
CREATE POLICY "audit_events_insert_own"
  ON public.audit_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
