CREATE TABLE public.insights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE, -- Optional, for general insights
  content text NOT NULL,
  type text DEFAULT 'neutral' NOT NULL, -- e.g., 'neutral', 'positive', 'negative'
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights." ON public.insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights." ON public.insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
