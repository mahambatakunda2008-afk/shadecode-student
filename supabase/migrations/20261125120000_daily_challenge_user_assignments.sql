-- Per-user daily challenge assignments and atomic, idempotent completion.
CREATE TABLE IF NOT EXISTS public.daily_challenge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date date NOT NULL,
  challenge jsonb NOT NULL CHECK (jsonb_typeof(challenge) = 'object'),
  completed_at timestamptz,
  xp_awarded integer NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_challenge_assignments_user_date_key UNIQUE (user_id, challenge_date)
);

CREATE INDEX IF NOT EXISTS daily_challenge_assignments_user_date_idx
  ON public.daily_challenge_assignments (user_id, challenge_date DESC);

ALTER TABLE public.daily_challenge_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own daily challenge assignments"
  ON public.daily_challenge_assignments;
CREATE POLICY "Users can read their own daily challenge assignments"
  ON public.daily_challenge_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.daily_challenge_assignments FROM anon, authenticated;
GRANT SELECT ON public.daily_challenge_assignments TO authenticated;
GRANT ALL ON public.daily_challenge_assignments TO service_role;

CREATE OR REPLACE FUNCTION public.complete_daily_challenge(
  p_assignment_id uuid,
  p_user_id uuid
)
RETURNS TABLE(success boolean, already_completed boolean, xp_awarded integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  assignment_row public.daily_challenge_assignments%ROWTYPE;
  reward integer;
BEGIN
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'complete_daily_challenge: service role required';
  END IF;

  SELECT * INTO assignment_row
  FROM public.daily_challenge_assignments
  WHERE id = p_assignment_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, 0;
    RETURN;
  END IF;

  IF assignment_row.completed_at IS NOT NULL THEN
    RETURN QUERY SELECT true, true, 0;
    RETURN;
  END IF;

  reward := LEAST(1000, GREATEST(0, COALESCE((assignment_row.challenge->>'xp_reward')::integer, 0)));

  UPDATE public.daily_challenge_assignments
  SET completed_at = now(), xp_awarded = reward
  WHERE id = p_assignment_id AND user_id = p_user_id;

  IF reward > 0 THEN
    PERFORM public.increment_xp(p_user_id, reward);
  END IF;

  RETURN QUERY SELECT true, false, reward;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_daily_challenge(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_daily_challenge(uuid, uuid) TO service_role;
