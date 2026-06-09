-- Add enrolled_courses array to user_profiles for Course Catalog enrollments

ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS enrolled_courses TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Index for fast membership queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_enrolled_courses_gin
  ON public.user_profiles USING gin (enrolled_courses);

-- NOTE: If Row Level Security is enabled on user_profiles, ensure policies allow
-- users to SELECT/UPDATE their own enrolled_courses via auth.uid() checks.
-- Example policy (run manually if needed):
-- CREATE POLICY "Users can manage own profile" ON public.user_profiles
--   FOR ALL
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);
