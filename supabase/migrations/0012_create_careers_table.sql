-- Migration: create careers table

CREATE TABLE IF NOT EXISTS public.careers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  salary_low integer,
  salary_high integer,
  related jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_careers_slug ON public.careers (slug);
CREATE INDEX IF NOT EXISTS idx_careers_title ON public.careers (title);
