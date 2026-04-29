CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'daily', -- e.g., 'daily', 'weekly', 'event'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_daily_challenge_per_date_type UNIQUE (date, type)
);

-- Optional: Add RLS policies for read access. 
-- For a public daily challenge, users should be able to read. 
-- CREATE POLICY "Enable read access for all users" ON daily_challenges FOR SELECT USING (TRUE);