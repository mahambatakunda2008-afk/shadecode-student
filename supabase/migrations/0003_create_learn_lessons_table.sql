CREATE TABLE IF NOT EXISTS public.learn_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) > 0),
  description TEXT NOT NULL DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS learn_lessons_user_id_idx
  ON public.learn_lessons(user_id);

CREATE INDEX IF NOT EXISTS learn_lessons_subject_id_idx
  ON public.learn_lessons(subject_id);

CREATE OR REPLACE FUNCTION public.set_learn_lessons_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS learn_lessons_set_updated_at ON public.learn_lessons;

CREATE TRIGGER learn_lessons_set_updated_at
BEFORE UPDATE ON public.learn_lessons
FOR EACH ROW
EXECUTE FUNCTION public.set_learn_lessons_updated_at();

ALTER TABLE public.learn_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own learn lessons." ON public.learn_lessons;
DROP POLICY IF EXISTS "Users can insert their own learn lessons." ON public.learn_lessons;
DROP POLICY IF EXISTS "Users can update their own learn lessons." ON public.learn_lessons;
DROP POLICY IF EXISTS "Users can delete their own learn lessons." ON public.learn_lessons;

CREATE POLICY "Users can view their own learn lessons."
  ON public.learn_lessons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own learn lessons."
  ON public.learn_lessons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learn lessons."
  ON public.learn_lessons FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learn lessons."
  ON public.learn_lessons FOR DELETE
  USING (auth.uid() = user_id);
