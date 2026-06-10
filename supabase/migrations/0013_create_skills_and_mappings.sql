-- Migration: create skills and mapping tables

CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.career_skills (
  career_id uuid NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  importance integer DEFAULT 1,
  PRIMARY KEY (career_id, skill_id)
);

CREATE TABLE IF NOT EXISTS public.career_recommended_courses (
  career_id uuid NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL,
  note text,
  PRIMARY KEY (career_id, subject_id)
);
