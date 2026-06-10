-- Add country_code and exam_board to user_profiles for localized onboarding

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS exam_board TEXT DEFAULT NULL;

-- Note: With RLS policies in place, ensure your policies permit updating these fields during onboarding.
