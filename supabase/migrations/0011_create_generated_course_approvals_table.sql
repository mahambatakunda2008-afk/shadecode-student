-- Migration: create generated_course_approvals audit table

CREATE TABLE IF NOT EXISTS public.generated_course_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id uuid NOT NULL REFERENCES public.generated_course_drafts(id) ON DELETE CASCADE,
  approved_by uuid NOT NULL,
  approved_at timestamptz NOT NULL DEFAULT now(),
  notes jsonb
);

CREATE INDEX IF NOT EXISTS idx_generated_course_approvals_draft_id ON public.generated_course_approvals(draft_id);
