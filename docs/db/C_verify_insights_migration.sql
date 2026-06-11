-- C. VERIFICATION  (READ-ONLY)
-- Run AFTER the backfill (0017) and BEFORE the drop (D). Run with a
-- service-role connection. Every check must report status = 'PASS'.
-- Nothing here writes or alters data.
--
-- Recommended flow (zero-residue, see plan E):
--   BEGIN;
--     \i supabase/migrations/0017_backfill_legacy_insights.sql
--     \i docs/db/C_verify_insights_migration.sql      -- inspect output
--   COMMIT;   -- if all PASS
--   ROLLBACK; -- if anything FAILS

WITH checks AS (
  -- 1. Archive integrity: snapshot row count must equal the legacy table.
  SELECT
    'archive_matches_legacy' AS check_name,
    (SELECT count(*) FROM public.insights)::text AS expected,
    (SELECT count(*) FROM public.insights_archive)::text AS actual,
    CASE WHEN (SELECT count(*) FROM public.insights)
            = (SELECT count(*) FROM public.insights_archive)
         THEN 'PASS' ELSE 'FAIL' END AS status

  UNION ALL
  -- 2. No data loss: every migratable legacy row is represented in
  --    cortex_insights (by preserved id OR content+time match). Expected 0.
  SELECT
    'legacy_rows_missing_from_canonical',
    '0',
    count(*)::text,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM public.insights i
  WHERE i.user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.cortex_insights c
      WHERE c.id = i.id
         OR (    c.user_id = i.user_id
             AND c.insight = COALESCE(NULLIF(btrim(i.content), ''), NULLIF(btrim(i.title), ''), '(legacy insight)')
             AND c.created_at IS NOT DISTINCT FROM i.generated_at)
    )

  UNION ALL
  -- 3. Canonical integrity: no NULL/blank insight text.
  SELECT
    'canonical_no_blank_insight',
    '0',
    count(*)::text,
    CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END
  FROM public.cortex_insights
  WHERE insight IS NULL OR btrim(insight) = ''

  UNION ALL
  -- 4. Canonical count is at least the count of distinct migratable legacy rows
  --    (sanity floor; equality not required because canonical may pre-date).
  SELECT
    'canonical_count_floor',
    (SELECT count(*) FROM (
        SELECT DISTINCT i.user_id,
               COALESCE(NULLIF(btrim(i.content), ''), NULLIF(btrim(i.title), ''), '(legacy insight)'),
               i.generated_at
        FROM public.insights i
        WHERE i.user_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id)
      ) d)::text,
    (SELECT count(*) FROM public.cortex_insights)::text,
    CASE WHEN (SELECT count(*) FROM public.cortex_insights)
            >= (SELECT count(*) FROM (
                  SELECT DISTINCT i.user_id,
                         COALESCE(NULLIF(btrim(i.content), ''), NULLIF(btrim(i.title), ''), '(legacy insight)'),
                         i.generated_at
                  FROM public.insights i
                  WHERE i.user_id IS NOT NULL
                    AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id)
                ) d)
         THEN 'PASS' ELSE 'FAIL' END
)
SELECT * FROM checks ORDER BY check_name;

-- Overall gate: returns a single row. Proceed to the drop ONLY if status='PASS'.
WITH checks AS (
  SELECT CASE WHEN (SELECT count(*) FROM public.insights)
                  = (SELECT count(*) FROM public.insights_archive)
              THEN 0 ELSE 1 END
       + (SELECT count(*) FROM public.insights i
          WHERE i.user_id IS NOT NULL
            AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id)
            AND NOT EXISTS (
              SELECT 1 FROM public.cortex_insights c
              WHERE c.id = i.id
                 OR (    c.user_id = i.user_id
                     AND c.insight = COALESCE(NULLIF(btrim(i.content), ''), NULLIF(btrim(i.title), ''), '(legacy insight)')
                     AND c.created_at IS NOT DISTINCT FROM i.generated_at)))
       + (SELECT count(*) FROM public.cortex_insights WHERE insight IS NULL OR btrim(insight) = '')
       AS failures
)
SELECT failures,
       CASE WHEN failures = 0 THEN 'PASS - safe to drop legacy insights'
            ELSE 'FAIL - DO NOT drop legacy insights' END AS overall
FROM checks;
