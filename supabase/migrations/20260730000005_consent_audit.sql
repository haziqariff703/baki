-- Baki MVP: consents + audit_events tables + RLS + atomic set_consent RPC
-- (AGENTS.md §2.3, §2.6, §14.2). Idempotent: safe to re-run (§10.2).
--
-- §2.3 Privacy by Design: consent is per-purpose and withdraw-as-easy-as-grant.
-- §14.2: audit events record the FACT of an action (consent, export, deletion)
-- and never the personal data or financial figures themselves.
--
-- consents: one row per (user_id, purpose), UPSERTED on toggle. No DELETE
-- policy — a consent is withdrawn, never removed.
-- audit_events: append-only — owner SELECT + INSERT only; NO update/delete.

CREATE TABLE IF NOT EXISTS public.consents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose text NOT NULL
    CHECK (purpose IN ('transaction_import', 'ai_assist', 'analytics', 'notifications')),
  status text NOT NULL CHECK (status IN ('granted', 'withdrawn')),
  consent_version text NOT NULL DEFAULT 'consent_v1'
    CHECK (char_length(consent_version) BETWEEN 1 AND 40),
  granted_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, purpose)
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

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

-- No DELETE policy on consents by design (§2.3 withdraw, not remove).

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('consent_granted', 'consent_withdrawn', 'data_exported', 'account_deletion_requested')),
  purpose text
    CHECK (purpose IS NULL OR purpose IN ('transaction_import', 'ai_assist', 'analytics', 'notifications')),
  format text CHECK (format IS NULL OR format IN ('json', 'csv')),
  -- Empty by default; only ever stores NON-personal, NON-financial markers.
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS audit_events_user_id_created_at_idx
  ON public.audit_events (user_id, created_at DESC);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_events_select_own" ON public.audit_events;
CREATE POLICY "audit_events_select_own"
  ON public.audit_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "audit_events_insert_own" ON public.audit_events;
CREATE POLICY "audit_events_insert_own"
  ON public.audit_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE policies on audit_events → append-only (§14.2).

-- ---------------------------------------------------------------------------
-- Atomic consent toggle: UPSERT the consent row AND insert the matching audit
-- event in one statement-set so both live or both die (§14.2 must never lose
-- an entry; the JS client has no multi-table transaction).
--
-- Runs as SECURITY INVOKER so RLS still applies to every statement: the caller
-- can only ever touch their own consent row. `p_status` decides grant vs
-- withdraw; timestamps are stamped by the DB (now()) — server-authoritative
-- (§2.6), never client-supplied.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_consent(
  p_purpose text,
  p_status text,
  p_version text
)
RETURNS public.consents
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_now timestamptz := timezone('utc', now());
  v_row public.consents;
BEGIN
  IF p_purpose NOT IN ('transaction_import', 'ai_assist', 'analytics', 'notifications') THEN
    RAISE EXCEPTION 'invalid purpose' USING ERRCODE = 'check_violation';
  END IF;
  IF p_status NOT IN ('granted', 'withdrawn') THEN
    RAISE EXCEPTION 'invalid status' USING ERRCODE = 'check_violation';
  END IF;
  IF p_version IS NULL OR char_length(p_version) = 0 THEN
    RAISE EXCEPTION 'invalid version' USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO public.consents (user_id, purpose, status, consent_version, granted_at, withdrawn_at, updated_at)
  VALUES (
    auth.uid(),
    p_purpose,
    p_status,
    p_version,
    CASE WHEN p_status = 'granted' THEN v_now ELSE NULL END,
    CASE WHEN p_status = 'withdrawn' THEN v_now ELSE NULL END,
    v_now
  )
  ON CONFLICT (user_id, purpose)
  DO UPDATE SET
    status = EXCLUDED.status,
    consent_version = EXCLUDED.consent_version,
    granted_at = CASE WHEN EXCLUDED.status = 'granted' THEN EXCLUDED.granted_at ELSE public.consents.granted_at END,
    withdrawn_at = CASE WHEN EXCLUDED.status = 'withdrawn' THEN EXCLUDED.withdrawn_at ELSE NULL END,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_row;

  INSERT INTO public.audit_events (user_id, action, purpose, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN p_status = 'granted' THEN 'consent_granted' ELSE 'consent_withdrawn' END,
    p_purpose,
    jsonb_build_object('consent_version', p_version)
  );

  RETURN v_row;
END;
$$;

-- Idempotent grants: only authenticated callers may execute.
REVOKE EXECUTE ON FUNCTION public.set_consent(text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_consent(text, text, text) TO authenticated;
