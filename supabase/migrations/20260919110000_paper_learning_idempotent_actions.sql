-- Make paper-learning submissions retry-safe with a stable client action id.
ALTER TABLE public.paper_learning_attempts
  ADD COLUMN IF NOT EXISTS client_action_id text;

CREATE UNIQUE INDEX IF NOT EXISTS paper_learning_attempts_client_action_uidx
  ON public.paper_learning_attempts (session_id, user_id, client_action_id)
  WHERE client_action_id IS NOT NULL;
