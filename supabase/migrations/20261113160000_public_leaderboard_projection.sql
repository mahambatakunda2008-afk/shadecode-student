-- Expose only the intentional leaderboard projection to anonymous clients.
-- The base profiles table contains private curriculum and learning preferences.
-- Keep authenticated base-table access unchanged in this first compatibility-safe step;
-- a separate follow-up can tighten authenticated SELECT after all consumers are migrated.

create or replace view public.leaderboard_profiles
with (security_barrier = true, security_invoker = false)
as
select id, username, xp, season_xp, level, streak
from public.profiles;

comment on view public.leaderboard_profiles is
  'Public-safe leaderboard projection. Never add private profile or curriculum fields.';

revoke all privileges on table public.leaderboard_profiles from public;
grant select on table public.leaderboard_profiles to anon, authenticated;

-- The leaderboard now reads through the narrow view. Anonymous clients no longer
-- need any direct access to the profiles base table.
revoke all privileges on table public.profiles from anon;
