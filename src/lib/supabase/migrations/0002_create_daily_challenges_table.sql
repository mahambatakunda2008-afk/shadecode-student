CREATE TABLE daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    xp_reward INTEGER NOT NULL,
    date DATE NOT NULL UNIQUE,
    type TEXT NOT NULL
);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Daily challenges are public."
  ON daily_challenges FOR SELECT
  USING (true);