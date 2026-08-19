-- Baki MVP: recurring_candidates table + RLS + atomic confirm RPC (AGENTS.md §10, §2.2).
-- Idempotent: safe to re-run over any partial remote state (§10.2).
--
-- §2.2: a candidate only becomes an active subscription through an explicit
-- human confirmation. The RPC enforces that invariant atomically in the
-- database: only the owner, only from 'pending', exactly once (row lock).
-- Deterministic derivation (cycle mapping, calendar-aware next charge date)
-- lives in TypeScript domain code (§2.1) and is passed in as parameters.

CREATE TABLE IF NOT EXISTS public.recurring_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  merchant_name text NOT NULL CHECK (char_length(merchant_name) BETWEEN 1 AND 120),
  amount_sen integer NOT NULL CHECK (amount_sen > 0),
  occurrence_count integer NOT NULL CHECK (occurrence_count >= 1),
  interval_days integer NOT NULL CHECK (interval_days > 0),
  -- Advisory only (§13.1); never drives an automatic action.
  ai_confidence numeric(3,2) NOT NULL CHECK (ai_confidence BETWEEN 0 AND 1),
  detected_at timestamptz NOT NULL,
  -- Lifecycle (§2.2): pending → confirmed | rejected. Terminal states are
  -- immutable; only the RPC below may set 'confirmed'.
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS recurring_candidates_user_id_idx
  ON public.recurring_candidates (user_id);
CREATE INDEX IF NOT EXISTS recurring_candidates_pending_idx
  ON public.recurring_candidates (user_id, detected_at)
  WHERE status = 'pending';

ALTER TABLE public.recurring_candidates ENABLE ROW LEVEL SECURITY;

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

DROP TRIGGER IF EXISTS recurring_candidates_set_updated_at ON public.recurring_candidates;
CREATE TRIGGER recurring_candidates_set_updated_at
  BEFORE UPDATE ON public.recurring_candidates
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Atomic candidate → subscription confirmation (§2.2).
--
-- Runs as SECURITY INVOKER so RLS still applies to every statement: the
-- caller can only ever confirm a candidate they own. A FOR UPDATE row lock
-- makes concurrent confirms impossible (second caller sees non-pending and
-- raises). Ratings default to the neutral midpoint 3; the user evaluates via
-- the subscription update flow afterwards.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_recurring_candidate(
  p_candidate_id uuid,
  p_cycle text,
  p_next_charge_date timestamptz
)
RETURNS public.subscriptions
LANGUAGE plpgsql
AS $$
DECLARE
  v_row public.recurring_candidates;
  v_sub public.subscriptions;
BEGIN
  IF p_cycle NOT IN ('weekly', 'monthly', 'quarterly', 'yearly') THEN
    RAISE EXCEPTION 'invalid cycle'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_row
  FROM public.recurring_candidates
  WHERE id = p_candidate_id
  FOR UPDATE;  -- serialises concurrent decisions on the same candidate

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'candidate not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'candidate already decided'
      USING ERRCODE = 'object_not_in_prerequisite_state';
  END IF;

  UPDATE public.recurring_candidates
  SET status = 'confirmed', decided_at = timezone('utc'::text, now())
  WHERE id = v_row.id;

  INSERT INTO public.subscriptions (
    user_id, merchant_name, amount_sen, cycle, next_charge_date,
    usage, necessity, affordability, uniqueness, satisfaction
  ) VALUES (
    v_row.user_id, v_row.merchant_name, v_row.amount_sen,
    p_cycle, p_next_charge_date,
    3, 3, 3, 3, 3  -- neutral defaults; user rates via update flow
  )
  RETURNING * INTO v_sub;

  RETURN v_sub;
END;
$$;

-- Idempotent grants (REVOKE/GRANT are safe to repeat).
REVOKE EXECUTE ON FUNCTION public.confirm_recurring_candidate(uuid, text, timestamptz) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.confirm_recurring_candidate(uuid, text, timestamptz) TO authenticated;
