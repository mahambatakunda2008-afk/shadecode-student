-- Make transfer grading claimable before the AI call so concurrent retries do not both finalize mastery.
ALTER TABLE public.paper_learning_transfer_questions
  ADD COLUMN IF NOT EXISTS submit_action_id text,
  ADD COLUMN IF NOT EXISTS grading_started_at timestamptz;

CREATE INDEX IF NOT EXISTS paper_learning_transfer_submit_action_idx
  ON public.paper_learning_transfer_questions(session_id, user_id, submit_action_id)
  WHERE submit_action_id IS NOT NULL;
