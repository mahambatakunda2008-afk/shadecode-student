-- Keep the leaderboard projection least-privilege without a SECURITY DEFINER view.
-- security_invoker=true makes the view honor the caller's base-table grants and RLS.
-- Anonymous clients receive SELECT on only the six explicitly public leaderboard columns.

create or replace view public.leaderboard_profiles
with (security_barrier = true, security_invoker = true)
as
select id, username, xp, season_xp, level, streak
from public.profiles;

revoke all privileges on table public.profiles from anon;
grant select (id, username, xp, season_xp, level, streak)
  on table public.profiles to anon;

revoke all privileges on table public.leaderboard_profiles from public;
grant select on table public.leaderboard_profiles to anon, authenticated;
