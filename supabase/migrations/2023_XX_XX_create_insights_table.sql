CREATE TABLE insights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights." ON insights
  FOR SELECT USING (auth.uid() = user_id);

-- NOTE: The Cortex Engine will typically use a Supabase Service Role Key to bypass RLS for inserting insights.
-- If insights were to be inserted by authenticated users directly, an INSERT policy would be needed.
-- For now, we assume engine-level insertion using the service role key.
-- CREATE POLICY "Users can insert their own insights." ON insights
--   FOR INSERT WITH CHECK (auth.uid() = user_id);