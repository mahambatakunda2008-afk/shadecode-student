-- Create the insights table
CREATE TABLE public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  insight_text text not null,
  created_at timestamp with time zone default now() not null
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for viewing own insights
CREATE POLICY "Users can view their own insights."
ON public.insights FOR SELECT
USING (auth.uid() = user_id);

-- Create RLS policy for inserting own insights
ON public.insights FOR INSERT
WITH CHECK (auth.uid() = user_id);