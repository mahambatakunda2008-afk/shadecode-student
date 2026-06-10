-- Migration: create user_careers table

CREATE TABLE IF NOT EXISTS public.user_careers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  career_id uuid NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, career_id)
);

CREATE INDEX IF NOT EXISTS idx_user_careers_user_id ON public.user_careers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_careers_career_id ON public.user_careers(career_id);
