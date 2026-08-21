-- Baki MVP: Add user profile attributes and settings to profiles table (§1.1, §2.3, §8.1).
-- Idempotent: ALTER ... ADD COLUMN IF NOT EXISTS is safe to re-run.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_student boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS education_tier text NOT NULL DEFAULT 'general' CHECK (education_tier IN ('tertiary_student', 'young_professional', 'general')),
  ADD COLUMN IF NOT EXISTS university_domain text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reminder_days_before integer NOT NULL DEFAULT 3 CHECK (reminder_days_before IN (1, 3, 7)),
  ADD COLUMN IF NOT EXISTS default_view_mode text NOT NULL DEFAULT 'actual' CHECK (default_view_mode IN ('actual', 'monthly')),
  ADD COLUMN IF NOT EXISTS statement_retention_window text NOT NULL DEFAULT 'immediate' CHECK (statement_retention_window IN ('immediate', '24_hours'));

-- Allow user to insert own profile if absent
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
