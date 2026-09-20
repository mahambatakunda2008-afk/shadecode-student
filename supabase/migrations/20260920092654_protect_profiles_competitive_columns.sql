-- Applied to production 2026-09-20 via Supabase MCP (version 20260920092654).
--
-- Leaderboard integrity: a signed-in student could previously set their own xp/level/streak/
-- weekly_xp/season_xp/rank/division directly (RLS lets a user update their own profiles row and the
-- authenticated role had UPDATE on those columns), or award themselves any amount via the
-- client-callable SECURITY DEFINER RPC increment_xp. profiles.xp drives the public leaderboard.
--
-- Fix: pin the competitive columns for browser roles (authenticated/anon) with a trigger that
-- IGNORES the write instead of raising, so the signup upsert and stale cached PWA bundles keep
-- working. service_role (all server-side awards), SECURITY DEFINER functions (increment_xp,
-- handle_new_user) and cron/migrations run as other roles and pass through unchanged.
-- Also revoke EXECUTE on increment_xp from authenticated: every real caller is server-side
-- (service role); awardXPClient had no callers. As a definer function it would bypass the trigger.
--
-- ROLLBACK:
--   drop trigger if exists profiles_protect_competitive_columns on public.profiles;
--   drop function if exists public.profiles_protect_competitive_columns();
--   grant execute on function public.increment_xp(uuid, integer) to authenticated;

create or replace function public.profiles_protect_competitive_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.xp := 0;
    new.level := 1;
    new.streak := 0;
    new.weekly_xp := 0;
    new.season_xp := 0;
    new.previous_rank := null;
    new.current_rank := null;
    new.division := 'Bronze';
    new.movement := 'HOLD';
  else
    new.xp := old.xp;
    new.level := old.level;
    new.streak := old.streak;
    new.weekly_xp := old.weekly_xp;
    new.season_xp := old.season_xp;
    new.current_season := old.current_season;
    new.previous_rank := old.previous_rank;
    new.current_rank := old.current_rank;
    new.division := old.division;
    new.movement := old.movement;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_competitive_columns on public.profiles;
create trigger profiles_protect_competitive_columns
  before insert or update on public.profiles
  for each row execute function public.profiles_protect_competitive_columns();

revoke execute on function public.increment_xp(uuid, integer) from authenticated;
