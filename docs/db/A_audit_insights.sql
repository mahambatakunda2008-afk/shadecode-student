-- A. INSIGHTS DATA AUDIT  (READ-ONLY)
-- Run with a service-role connection (Supabase SQL editor or psql) so RLS does
-- not hide rows. Nothing here writes or alters data.
--
-- Usage:
--   psql "$SUPABASE_DB_URL" -f docs/db/A_audit_insights.sql
-- or paste into the Supabase SQL editor.

-- --------------------------------------------------------------------------
-- A.1  Headline metrics (single tidy result)
-- --------------------------------------------------------------------------
SELECT 'cortex_insights_rows' AS metric, count(*)::text AS value
FROM public.cortex_insights
UNION ALL
SELECT 'legacy_insights_rows', count(*)::text
FROM public.insights
UNION ALL
-- Rows that the backfill (0017) would actually insert (migration impact).
SELECT 'rows_to_backfill', count(*)::text
FROM public.insights i
WHERE i.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id)
  AND NOT EXISTS (
    SELECT 1 FROM public.cortex_insights c
    WHERE c.user_id = i.user_id
      AND c.insight = COALESCE(NULLIF(btrim(i.content), ''), NULLIF(btrim(i.title), ''), '(legacy insight)')
      AND c.created_at IS NOT DISTINCT FROM i.generated_at
  )
UNION ALL
-- Legacy rows whose user_id has no matching auth.users row (cannot be migrated;
-- would violate the FK). These are skipped by the backfill.
SELECT 'legacy_rows_orphan_user', count(*)::text
FROM public.insights i
WHERE i.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = i.user_id)
UNION ALL
-- Legacy rows with no usable text in either content or title (get the
-- '(legacy insight)' placeholder on backfill).
SELECT 'legacy_rows_blank_text', count(*)::text
FROM public.insights
WHERE COALESCE(NULLIF(btrim(content), ''), NULLIF(btrim(title), '')) IS NULL
UNION ALL
-- Possible duplicate groups already inside cortex_insights.
SELECT 'cortex_duplicate_groups', count(*)::text
FROM (
  SELECT 1 FROM public.cortex_insights
  GROUP BY user_id, insight, created_at
  HAVING count(*) > 1
) d
UNION ALL
-- Possible duplicate groups inside the legacy table.
SELECT 'legacy_duplicate_groups', count(*)::text
FROM (
  SELECT 1 FROM public.insights
  GROUP BY user_id, COALESCE(NULLIF(btrim(content), ''), NULLIF(btrim(title), '')), generated_at
  HAVING count(*) > 1
) d
ORDER BY metric;

-- --------------------------------------------------------------------------
-- A.2  Duplicate detail in cortex_insights (review before/after migration)
-- --------------------------------------------------------------------------
SELECT user_id, insight, created_at, count(*) AS copies
FROM public.cortex_insights
GROUP BY user_id, insight, created_at
HAVING count(*) > 1
ORDER BY copies DESC, user_id
LIMIT 200;

-- --------------------------------------------------------------------------
-- A.3  Duplicate detail in legacy insights
-- --------------------------------------------------------------------------
SELECT
  user_id,
  COALESCE(NULLIF(btrim(content), ''), NULLIF(btrim(title), '')) AS insight_text,
  generated_at,
  count(*) AS copies
FROM public.insights
GROUP BY 1, 2, 3
HAVING count(*) > 1
ORDER BY copies DESC, user_id
LIMIT 200;
