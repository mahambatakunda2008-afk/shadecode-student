-- Ensure onboarding state has one canonical place on user_profiles.
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tour_completed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed
  ON public.user_profiles (user_id, onboarding_completed);
