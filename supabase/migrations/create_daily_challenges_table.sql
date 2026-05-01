CREATE TABLE public.daily_challenges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  xp_reward integer NOT NULL,
  date date NOT NULL UNIQUE,
  type text NOT NULL
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view challenges (read-only for now)
CREATE POLICY "Allow authenticated users to view daily challenges" ON public.daily_challenges
  FOR SELECT TO authenticated USING (TRUE);

-- No specific user insert/update policies yet, as challenges are system-generated and managed.
