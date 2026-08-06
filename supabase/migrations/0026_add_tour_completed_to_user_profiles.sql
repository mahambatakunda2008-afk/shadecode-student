-- user_profiles.tour_completed is read by src/lib/user-profile.ts's
-- getUserProfileFlags() and written by src/lib/actions/onboarding.ts's
-- completeTour() -- both already correctly targeted this table/column,
-- but the column never existed, so every read errored (select failed on
-- an unknown column) and getUserProfileFlags() always returned null,
-- and every write silently failed (wrapped in a catch-all "never throw").
-- Net effect: the dashboard tour's server-side completion tracking has
-- never worked; tourCompleted always defaulted to false on every
-- dashboard load, regardless of what completeTour() attempted to record
-- -- confirmed live: every sampled user had tour_completed = false even
-- where onboarding_complete = true.
--
-- Applied live via Supabase MCP and verified
-- (information_schema.columns) before this file was added, so migration
-- history matches reality.
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS tour_completed boolean NOT NULL DEFAULT false;
