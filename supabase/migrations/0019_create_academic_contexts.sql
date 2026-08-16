-- First-class academic context for university and polytechnic/TVET learners.
-- Kept separate from user_profiles so existing secondary schemas remain stable.

CREATE TABLE IF NOT EXISTS public.academic_contexts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pathway TEXT NOT NULL CHECK (pathway IN ('university', 'tvet')),
  institution TEXT,
  programme TEXT NOT NULL,
  year_level TEXT,
  semester TEXT,
  courses JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT academic_contexts_courses_array CHECK (jsonb_typeof(courses) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_academic_contexts_pathway ON public.academic_contexts(pathway);
CREATE INDEX IF NOT EXISTS idx_academic_contexts_institution ON public.academic_contexts(institution);

ALTER TABLE public.academic_contexts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own academic context" ON public.academic_contexts;
CREATE POLICY "Users can read own academic context"
  ON public.academic_contexts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own academic context" ON public.academic_contexts;
CREATE POLICY "Users can insert own academic context"
  ON public.academic_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own academic context" ON public.academic_contexts;
CREATE POLICY "Users can update own academic context"
  ON public.academic_contexts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own academic context" ON public.academic_contexts;
CREATE POLICY "Users can delete own academic context"
  ON public.academic_contexts FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_academic_context_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academic_contexts_updated_at ON public.academic_contexts;
CREATE TRIGGER academic_contexts_updated_at
  BEFORE UPDATE ON public.academic_contexts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_academic_context_updated_at();
