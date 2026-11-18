-- Data-free baseline matching the current live profiles/leaderboard access shape.
-- Used only by the isolated profile privacy contract workflow.
create table public.profiles (
  id uuid primary key,
  username text,
  xp integer not null default 0,
  season_xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  display_name text,
  education_stage text,
  study_level text,
  curriculum_board text,
  curriculum_profile text,
  curriculum_subjects jsonb,
  subjects jsonb
);

-- Supabase applies broad default privileges to newly created public tables.
-- Revoke those table-level grants, then model the live six-column anon grant.
revoke all privileges on table public.profiles from public, anon;
grant select (id, username, xp, season_xp, level, streak)
  on table public.profiles to anon;

alter table public.profiles enable row level security;
grant select, insert, update, delete on public.profiles to authenticated;

create policy "Public leaderboard read"
  on public.profiles for select to public using (true);
create policy "Authenticated users can insert own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Authenticated users can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create view public.leaderboard_profiles
  with (security_barrier = true, security_invoker = true)
  as select id, username, xp, season_xp, level, streak from public.profiles;

grant all privileges on table public.leaderboard_profiles to anon, authenticated;
