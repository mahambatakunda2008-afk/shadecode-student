-- Keep learner profile rows private while preserving the intentionally public leaderboard.
-- The view is an owner-executed, fixed projection: only these six columns are exposed.
-- The view owner is postgres; profiles does not FORCE ROW LEVEL SECURITY.
begin;

drop policy if exists "Public leaderboard read" on public.profiles;
drop policy if exists "Authenticated users can read own profile" on public.profiles;

create policy "Authenticated users can read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- A security-invoker view would require anon to hold SELECT on profiles, which
-- would re-open the table-level exposure. Keep the view owner-executed instead,
-- with an intentionally narrow, audited projection and SELECT-only grants.
alter view public.leaderboard_profiles
  set (security_barrier = true, security_invoker = false);

revoke all privileges on table public.leaderboard_profiles
  from public, anon, authenticated;
grant select on table public.leaderboard_profiles to anon, authenticated;

comment on view public.leaderboard_profiles is
  'Public leaderboard projection only: id, username, xp, season_xp, level, streak. Owner-executed with SELECT-only browser grants; never add learner curriculum or profile fields.';

commit;
