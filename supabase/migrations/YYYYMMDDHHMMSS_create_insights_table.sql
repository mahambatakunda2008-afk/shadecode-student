CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    insight_text TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL, -- Nullable if insight isn't subject-specific
    pattern_type TEXT, -- e.g., 'consistency', 'procrastination', 'focus_areas'
    metadata JSONB DEFAULT '{}' -- For future extensibility
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights."
  ON insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights."
  ON insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);
