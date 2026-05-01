CREATE TABLE public.insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  generated_at timestamp with time zone DEFAULT now() NOT NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights" ON public.insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights (via API)" ON public.insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);
