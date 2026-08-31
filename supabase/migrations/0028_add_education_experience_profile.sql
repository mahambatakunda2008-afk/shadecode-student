-- Canonical learner education context. UI/UX, lesson scaffolding and assessment
-- behavior must derive from one account-owned source instead of ad-hoc metadata.
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS education_stage text,
  ADD COLUMN IF NOT EXISTS education_grade integer,
  ADD COLUMN IF NOT EXISTS education_year text,
  ADD COLUMN IF NOT EXISTS education_curriculum text,
  ADD COLUMN IF NOT EXISTS education_subjects text[] DEFAULT '{}';

ALTER TABLE IF EXISTS public.user_profiles
  ADD CONSTRAINT user_profiles_education_grade_valid
  CHECK (education_grade IS NULL OR education_grade BETWEEN 1 AND 13);

CREATE INDEX IF NOT EXISTS idx_user_profiles_education_stage
  ON public.user_profiles(education_stage);
