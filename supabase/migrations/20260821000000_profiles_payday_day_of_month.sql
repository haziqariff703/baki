-- Baki MVP: Add payday_day_of_month to profiles table (AGENTS.md §8.1, §9)
-- Idempotent: safe to run over existing database schema

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payday_day_of_month integer NOT NULL DEFAULT 25
  CHECK (payday_day_of_month >= 1 AND payday_day_of_month <= 31);
