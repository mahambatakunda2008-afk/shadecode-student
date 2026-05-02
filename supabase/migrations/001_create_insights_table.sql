CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights." ON insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own insights." ON insights FOR INSERT WITH CHECK (auth.uid() = user_id);