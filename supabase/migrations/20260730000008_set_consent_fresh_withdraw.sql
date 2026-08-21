-- Baki MVP: fix set_consent RPC INSERT path for a fresh-withdraw record
-- (AGENTS.md §2.6). Idempotent CREATE OR REPLACE.
--
-- Bug: on the first-ever action for a purpose where the user withdraws (no
-- prior consent row), the INSERT set consent_version to NULL, violating the
-- column's NOT NULL constraint. Correct behaviour:
--   - INSERT (no prior row): use p_version (adapter always passes the current
--     CONSENT_RULE_VERSION) for both grant and withdraw.
--   - ON CONFLICT (existing row): grant updates to p_version; withdraw
--     preserves the previously agreed version.

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
    consent_version = CASE
      WHEN EXCLUDED.status = 'granted' THEN EXCLUDED.consent_version
      ELSE public.consents.consent_version  -- preserve on withdraw
    END,
    granted_at = CASE WHEN EXCLUDED.status = 'granted' THEN EXCLUDED.granted_at ELSE public.consents.granted_at END,
    withdrawn_at = CASE WHEN EXCLUDED.status = 'withdrawn' THEN EXCLUDED.withdrawn_at ELSE NULL END,
    updated_at = EXCLUDED.updated_at
  RETURNING * INTO v_row;

  INSERT INTO public.audit_events (user_id, action, purpose, metadata)
  VALUES (
    auth.uid(),
    CASE WHEN p_status = 'granted' THEN 'consent_granted' ELSE 'consent_withdrawn' END,
    p_purpose,
    jsonb_build_object('consent_version', v_row.consent_version)
  );

  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_consent(text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.set_consent(text, text, text) TO authenticated;
