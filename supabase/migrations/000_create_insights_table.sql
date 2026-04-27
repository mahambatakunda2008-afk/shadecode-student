CREATE TABLE insights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  insight_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  subject_id uuid REFERENCES subjects(id)
);

-- Optional: Add RLS policies for insights table
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights."
  ON insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights."
  ON insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);
