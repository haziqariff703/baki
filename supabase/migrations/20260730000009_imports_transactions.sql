-- Baki MVP: imports + transactions tables + RLS (AGENTS.md §7, §12, §2.6).
-- Idempotent: safe to re-run (§10.2).
--
-- imports: one ledger row per upload — the traceability (§2.6 data source) and
-- purge-tracking (§12) record. `storage_path` is nulled after the raw file is
-- purged. `idempotency_key` lets a retried upload short-circuit to the prior
-- result once the raw file has been deleted.
--
-- transactions: the validated, parsed rows that feed recurring-detection.
-- Each row carries `source` ('csv'|'pdf'|'manual') and links to its import
-- batch via `import_id`.

CREATE TABLE IF NOT EXISTS public.imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('csv', 'pdf')),
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  storage_path text,                          -- nulled after purge (§12)
  row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
  error_count integer NOT NULL DEFAULT 0 CHECK (error_count >= 0),
  truncated boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'completed'
    CHECK (status IN ('completed', 'failed')),
  parser_version text NOT NULL DEFAULT 'import_v1'
    CHECK (char_length(parser_version) BETWEEN 1 AND 40),
  idempotency_key uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS imports_user_id_idx ON public.imports (user_id);

ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imports_select_own" ON public.imports;
CREATE POLICY "imports_select_own"
  ON public.imports FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "imports_insert_own" ON public.imports;
CREATE POLICY "imports_insert_own"
  ON public.imports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Server-only update (e.g. purge nulling storage_path), scoped to owner.
DROP POLICY IF EXISTS "imports_update_own" ON public.imports;
CREATE POLICY "imports_update_own"
  ON public.imports FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  import_id uuid REFERENCES public.imports ON DELETE SET NULL,
  merchant_name text NOT NULL CHECK (char_length(merchant_name) BETWEEN 1 AND 120),
  amount_sen integer NOT NULL CHECK (amount_sen > 0),
  transaction_date timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'pdf')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS transactions_user_date_idx
  ON public.transactions (user_id, transaction_date);
CREATE INDEX IF NOT EXISTS transactions_import_id_idx ON public.transactions (import_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE on transactions in the MVP — append-only, minimal data (§7).
