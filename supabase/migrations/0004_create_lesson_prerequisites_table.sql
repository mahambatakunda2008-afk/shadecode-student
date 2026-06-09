-- Creates lightweight prerequisites table linking learn_lessons rows

CREATE TABLE IF NOT EXISTS public.lesson_prerequisites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.learn_lessons(id) ON DELETE CASCADE,
  prerequisite_lesson_id UUID NOT NULL REFERENCES public.learn_lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS lesson_prereqs_lesson_id_idx
  ON public.lesson_prerequisites(lesson_id);

CREATE INDEX IF NOT EXISTS lesson_prereqs_prereq_id_idx
  ON public.lesson_prerequisites(prerequisite_lesson_id);
