-- 0017_backfill_legacy_insights.sql
-- Insights consolidation, step 2 of 3 (see docs/db/insights-cleanup-plan.md).
--
-- Copies rows from the legacy public.insights table into the canonical
-- public.cortex_insights table, then leaves the legacy table untouched.
--
-- Properties:
--   * ADDITIVE ONLY  -- never drops or mutates legacy data.
--   * IDEMPOTENT     -- re-running inserts nothing new (id + content/time dedupe).
--   * SELF-SKIPPING  -- no-ops cleanly on databases where public.insights was
--                       never created (e.g. a fresh replay after the legacy
--                       create-files have been removed).
--   * ROLLBACK-READY -- snapshots the legacy table into public.insights_archive
--                       exactly once before any write.
--
-- Assumes the live legacy shape (migration 0000): public.insights(
--   id uuid, user_id uuid, title text, content text,
--   generated_at timestamptz, metadata jsonb, is_read boolean).
-- This is the shape confirmed in production; other historical create-files in
-- the repo were never applied. If your insights table has a different shape,
-- stop and adjust the column mapping below before running.

DO $$
DECLARE
  v_inserted bigint;
BEGIN
  -- 0. Nothing to do if the legacy table does not exist.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'insights'
  ) THEN
    RAISE NOTICE '[0017] public.insights not found; skipping backfill.';
    RETURN;
  END IF;

  -- 1. One-time immutable snapshot for rollback.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'insights_archive'
  ) THEN
    EXECUTE 'CREATE TABLE public.insights_archive AS TABLE public.insights';
    RAISE NOTICE '[0017] Created snapshot public.insights_archive.';
  ELSE
    RAISE NOTICE '[0017] public.insights_archive already exists; reusing it.';
  END IF;

  -- 2. Idempotent backfill.
  --    Dedupe on (a) preserved id via ON CONFLICT, and (b) a content+time match
  --    in case an earlier out-of-band copy used freshly-generated ids.
  WITH src AS (
    SELECT
      i.id,
      i.user_id,
      COALESCE(NULLIF(btrim(i.content), ''), NULLIF(btrim(i.title), ''), '(legacy insight)') AS insight,
      i.generated_at
    FROM public.insights i
    WHERE i.user_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id)  -- respect FK
  )
  INSERT INTO public.cortex_insights (id, user_id, insight, created_at)
  SELECT s.id, s.user_id, s.insight, COALESCE(s.generated_at, NOW())
  FROM src s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.cortex_insights c
    WHERE c.user_id = s.user_id
      AND c.insight = s.insight
      AND c.created_at IS NOT DISTINCT FROM s.generated_at
  )
  ON CONFLICT (id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RAISE NOTICE '[0017] Backfill complete; % row(s) inserted into cortex_insights.', v_inserted;
END $$;
