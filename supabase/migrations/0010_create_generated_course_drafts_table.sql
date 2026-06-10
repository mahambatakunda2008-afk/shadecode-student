-- Migration: create generated_course_drafts table
-- Run dedupe / backup before applying in production

CREATE TABLE IF NOT EXISTS public.generated_course_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  draft jsonb NOT NULL,
  moderation_issues jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid
);

-- Index for lookups by user
CREATE INDEX IF NOT EXISTS idx_generated_course_drafts_user_id ON public.generated_course_drafts (user_id);
