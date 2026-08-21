-- Baki MVP: add per-user monthly allowance to profiles (AGENTS.md §1, §8.1).
-- Idempotent: ALTER ... ADD COLUMN IF NOT EXISTS is safe to re-run.
--
-- safeToSpendSen = availableBalance − monthlyCommitment. The available balance
-- is a per-user setting (not derived), and belongs on the RLS-protected
-- profiles table. DEFAULT 0 is honest for an MVP: safe-to-spend then equals
-- −monthlyCommitment (an overrun) rather than a fabricated surplus.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_allowance_sen integer
    NOT NULL DEFAULT 0
    CHECK (monthly_allowance_sen >= 0);
