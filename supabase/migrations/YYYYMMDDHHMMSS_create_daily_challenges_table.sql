CREATE TABLE daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    xp_reward INTEGER NOT NULL,
    date DATE NOT NULL UNIQUE, -- Ensures only one challenge per day
    type VARCHAR(50) NOT NULL -- e.g., 'task_completion', 'subject_focus', 'reflection'
);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges are viewable by all users."
  ON daily_challenges FOR SELECT
  USING (true);
