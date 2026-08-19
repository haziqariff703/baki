-- Baki MVP: default user_id to the authenticated session (AGENTS.md §10.1, §11).
-- Idempotent: ALTER ... SET DEFAULT is safe to re-run.
--
-- RLS insert policies check `auth.uid() = user_id`. When a client omits
-- user_id (NULL), that check fails. Defaulting to auth.uid() means "me" is
-- filled in from the verified session — identity is still never trusted
-- from the client, and the WITH CHECK continues to reject cross-user writes.

ALTER TABLE public.subscriptions
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.recurring_candidates
  ALTER COLUMN user_id SET DEFAULT auth.uid();
