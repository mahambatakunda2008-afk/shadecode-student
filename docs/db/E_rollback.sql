-- E. ROLLBACK
-- Three scenarios, in order of preference. Run with a service-role connection.

-- ==========================================================================
-- E.1  PREFERRED: verification failed, backfill not yet committed.
-- ==========================================================================
-- If you ran the backfill + verification inside a single transaction (see
-- docs/db/insights-cleanup-plan.md), simply abort it. Nothing persists.
--
--   ROLLBACK;
--
-- Original state is fully restored; cortex_insights and insights are unchanged
-- and no snapshot is left behind.


-- ==========================================================================
-- E.2  Backfill already COMMITTED, legacy table NOT yet dropped.
-- ==========================================================================
-- Every backfilled row preserved its original legacy id, so the rows added by
-- 0017 are exactly those cortex_insights rows whose id exists in the snapshot
-- AND which are byte-identical to the archived legacy row. This removes only
-- rows that the backfill itself inserted.
--
-- NOTE: This is only needed if you did NOT use the transactional flow (E.1).
-- Inspect the SELECT first, then run the DELETE.

-- Preview what would be removed:
SELECT c.id, c.user_id, c.insight, c.created_at
FROM public.cortex_insights c
JOIN public.insights_archive a
  ON a.id = c.id
 AND c.insight = COALESCE(NULLIF(btrim(a.content), ''), NULLIF(btrim(a.title), ''), '(legacy insight)')
 AND c.created_at = COALESCE(a.generated_at, c.created_at);

-- Remove them:
-- DELETE FROM public.cortex_insights c
-- USING public.insights_archive a
-- WHERE a.id = c.id
--   AND c.insight = COALESCE(NULLIF(btrim(a.content), ''), NULLIF(btrim(a.title), ''), '(legacy insight)')
--   AND c.created_at = COALESCE(a.generated_at, c.created_at);


-- ==========================================================================
-- E.3  Legacy table already DROPPED -- restore it from the snapshot.
-- ==========================================================================
-- Recreates public.insights from public.insights_archive with the original
-- (migration 0000) constraints and RLS policies.

CREATE TABLE IF NOT EXISTS public.insights AS TABLE public.insights_archive;

ALTER TABLE public.insights ADD PRIMARY KEY (id);
ALTER TABLE public.insights ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights."
  ON public.insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own insights."
  ON public.insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own insights."
  ON public.insights FOR UPDATE USING (auth.uid() = user_id);
