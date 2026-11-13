-- Exact curriculum identity per learner/subject.
-- This complements legacy profile fields without inferring syllabus identity
-- from a subject name, education level, or exam board alone.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS curriculum_subjects JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_curriculum_subjects_array_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_curriculum_subjects_array_check
  CHECK (jsonb_typeof(curriculum_subjects) = 'array');

COMMENT ON COLUMN public.profiles.curriculum_subjects IS
  'Exact learner curriculum identities. Each item must contain boardId, qualificationId, level, syllabusId, syllabusVersion, and subjectId. No syllabus inference is permitted.';

-- Keep client access subject to the existing profiles RLS policies.
