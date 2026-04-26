CREATE TABLE insights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  insight_text TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  type TEXT DEFAULT 'pattern' NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own insights" ON insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own insights" ON insights FOR INSERT WITH CHECK (auth.uid() = user_id);
