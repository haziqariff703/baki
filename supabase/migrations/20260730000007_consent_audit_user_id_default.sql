-- Baki MVP: default user_id to the authenticated session for consent/audit
-- tables (AGENTS.md §10.1, §11). Idempotent: ALTER ... SET DEFAULT is safe.
--
-- Direct inserts (audit events for export/deletion) and the RPC both need the
-- owner filled from the session. Defaulting to auth.uid() means "me" is filled
-- automatically while the WITH CHECK still rejects cross-user writes.

ALTER TABLE public.consents
  ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public.audit_events
  ALTER COLUMN user_id SET DEFAULT auth.uid();
