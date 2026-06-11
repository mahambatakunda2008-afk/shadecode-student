-- 0016_create_cortex_insights_table.sql
-- Canonical store for Cortex insights. Previously the app wrote insights to
-- three divergent shapes (insights.content, insights.insight_text,
-- insights.title+content+metadata); all code now uses cortex_insights.insight.

CREATE TABLE IF NOT EXISTS public.cortex_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  insight TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS cortex_insights_user_id_created_at_idx
  ON public.cortex_insights (user_id, created_at DESC);

ALTER TABLE public.cortex_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cortex_insights'
      AND policyname = 'Users can view their own cortex insights'
  ) THEN
    CREATE POLICY "Users can view their own cortex insights"
      ON public.cortex_insights FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cortex_insights'
      AND policyname = 'Users can insert their own cortex insights'
  ) THEN
    CREATE POLICY "Users can insert their own cortex insights"
      ON public.cortex_insights FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
