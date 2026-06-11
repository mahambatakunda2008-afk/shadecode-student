-- D. CLEANUP / DROP LEGACY insights  (DESTRUCTIVE -- MANUAL STEP)
-- Insights consolidation, step 3 of 3 (see docs/db/insights-cleanup-plan.md).
--
-- This is intentionally NOT placed in supabase/migrations/ so it is never
-- auto-applied by `supabase db push`. Run it BY HAND only after:
--   1. 0017 backfill has run, and
--   2. docs/db/C_verify_insights_migration.sql reports overall = 'PASS'.
--
-- It is self-guarding: it refuses to drop unless the rollback snapshot exists
-- and every migratable legacy row is present in cortex_insights. The snapshot
-- public.insights_archive is deliberately LEFT IN PLACE as the rollback source.

DO $$
DECLARE
  v_missing bigint;
BEGIN
  -- Already gone?
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'insights'
  ) THEN
    RAISE NOTICE '[D] public.insights already absent; nothing to drop.';
    RETURN;
  END IF;

  -- Guard 1: rollback snapshot must exist.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'insights_archive'
  ) THEN
    RAISE EXCEPTION '[D] Refusing to drop: snapshot public.insights_archive not found. Run 0017 first.';
  END IF;

  -- Guard 2: no migratable legacy row may be missing from cortex_insights.
  SELECT count(*) INTO v_missing
  FROM public.insights i
  WHERE i.user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.cortex_insights c
      WHERE c.id = i.id
         OR (    c.user_id = i.user_id
             AND c.insight = COALESCE(NULLIF(btrim(i.content), ''), NULLIF(btrim(i.title), ''), '(legacy insight)')
             AND c.created_at IS NOT DISTINCT FROM i.generated_at)
    );

  IF v_missing > 0 THEN
    RAISE EXCEPTION '[D] Refusing to drop: % legacy row(s) not present in cortex_insights.', v_missing;
  END IF;

  EXECUTE 'DROP TABLE public.insights';
  RAISE NOTICE '[D] Dropped public.insights. Snapshot public.insights_archive retained for rollback.';
END $$;

-- When you are fully confident (e.g. after a retention window) you may also
-- remove the snapshot. Keep it until then.
-- DROP TABLE IF EXISTS public.insights_archive;
