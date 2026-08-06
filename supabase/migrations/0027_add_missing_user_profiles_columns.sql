-- last_course_generated_at: read/written by src/lib/cortex/generateCourse.ts
-- as a cooldown/rate-limit mechanism for AI course generation. Column
-- never existed, so every select errored, the cooldown check always saw
-- "no prior generation," and the cooldown has never actually enforced
-- anything -- a real cost/abuse gap for an AI-cost-incurring feature.
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS last_course_generated_at timestamptz;

-- enrolled_courses: read/written by src/app/api/catalog/enroll/route.ts.
-- Confirmed zero callers anywhere in the UI -- unwired/unfinished
-- feature, not an active bug. Adding anyway since it's a one-line,
-- low-risk addition that unblocks the route for whenever it is wired up,
-- rather than leaving an API route permanently broken by a missing column.
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS enrolled_courses text[] DEFAULT '{}';
