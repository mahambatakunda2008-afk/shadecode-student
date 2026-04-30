CREATE TABLE insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL, -- Insights can be subject-specific or general
    content TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights." ON insights
  FOR SELECT USING (auth.uid() = user_id);

-- RLS for insert is omitted here as Cortex will use a service role key to insert,
-- which bypasses RLS policies. User-facing clients would need an insert policy.