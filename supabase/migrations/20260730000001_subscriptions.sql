-- Baki MVP: subscriptions table + RLS policies (AGENTS.md §10).
-- Idempotent: safe to re-run over any partial remote state (§10.2).
-- Money is integer sen (§8.1): amount_sen > 0. Ratings 1–5. Cycle enum.

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  merchant_name text NOT NULL CHECK (char_length(merchant_name) BETWEEN 1 AND 120),
  amount_sen integer NOT NULL CHECK (amount_sen > 0),
  cycle text NOT NULL CHECK (cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_charge_date timestamptz NOT NULL,
  usage integer NOT NULL CHECK (usage BETWEEN 1 AND 5),
  necessity integer NOT NULL CHECK (necessity BETWEEN 1 AND 5),
  affordability integer NOT NULL CHECK (affordability BETWEEN 1 AND 5),
  uniqueness integer NOT NULL CHECK (uniqueness BETWEEN 1 AND 5),
  satisfaction integer NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on ownership for list queries (§10.3).
CREATE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON public.subscriptions (user_id);

-- Enable RLS (§10.1). Idempotent.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_own"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_update_own" ON public.subscriptions;
CREATE POLICY "subscriptions_update_own"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subscriptions_delete_own" ON public.subscriptions;
CREATE POLICY "subscriptions_delete_own"
  ON public.subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Keep updated_at fresh on change.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
