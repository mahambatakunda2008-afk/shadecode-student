-- 0018_create_cortex_memory_table.sql
-- Persistent Cortex memory for long-term learning patterns
-- Replaces in-memory Map-based storage with database-backed summaries

CREATE TABLE IF NOT EXISTS public.cortex_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Subject mastery summaries
  frequently_studied_subjects JSONB DEFAULT '[]'::jsonb,
  weak_subjects JSONB DEFAULT '[]'::jsonb,
  strong_subjects JSONB DEFAULT '[]'::jsonb,
  
  -- Study pattern summaries
  preferred_study_hours JSONB DEFAULT '[]'::jsonb, -- Array of hour buckets (0-23) with frequency
  average_session_duration_minutes INTEGER DEFAULT 0,
  total_study_sessions INTEGER DEFAULT 0,
  
  -- Performance trends
  exam_scores JSONB DEFAULT '[]'::jsonb, -- Array of {score, subject, date}
  average_exam_score DECIMAL(5,2) DEFAULT 0,
  
  -- Streak patterns
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  streak_history JSONB DEFAULT '[]'::jsonb, -- Array of {date, streak_count}
  
  -- Learning patterns
  total_lessons_completed INTEGER DEFAULT 0,
  total_study_time_minutes INTEGER DEFAULT 0,
  last_study_date TIMESTAMPTZ,
  
  -- Computed insights (AI-generated summaries)
  learning_insight TEXT,
  recommendation_insight TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one row per user
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS cortex_memory_user_id_idx
  ON public.cortex_memory(user_id);

CREATE INDEX IF NOT EXISTS cortex_memory_updated_at_idx
  ON public.cortex_memory(updated_at DESC);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.set_cortex_memory_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cortex_memory_set_updated_at ON public.cortex_memory;

CREATE TRIGGER cortex_memory_set_updated_at
BEFORE UPDATE ON public.cortex_memory
FOR EACH ROW
EXECUTE FUNCTION public.set_cortex_memory_updated_at();

ALTER TABLE public.cortex_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own cortex memory." ON public.cortex_memory;
DROP POLICY IF EXISTS "Users can insert their own cortex memory." ON public.cortex_memory;
DROP POLICY IF EXISTS "Users can update their own cortex memory." ON public.cortex_memory;

CREATE POLICY "Users can view their own cortex memory."
  ON public.cortex_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cortex memory."
  ON public.cortex_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cortex memory."
  ON public.cortex_memory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
