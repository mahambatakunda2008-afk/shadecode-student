-- Run after the profile privacy migration in a disposable Supabase database.
-- Verifies grants, RLS policy shape, the narrow public projection, and owner isolation.

do $$
declare
  v_options text[];
  v_definition text;
  v_columns text[];
  v_count integer;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass) then
    raise exception 'profiles RLS must remain enabled';
  end if;

  if has_table_privilege('anon', 'public.profiles', 'SELECT') then
    raise exception 'anon must not have direct profiles SELECT';
  end if;
  if not has_table_privilege('authenticated', 'public.profiles', 'SELECT') then
    raise exception 'authenticated must retain profiles SELECT for owner-scoped reads';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and cmd = 'SELECT'
      and 'public' = any(roles)
  ) then
    raise exception 'profiles must not retain a public SELECT policy';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Authenticated users can read own profile'
      and cmd = 'SELECT'
      and roles = array['authenticated']::name[]
      and qual ilike '%auth.uid()%id%'
  ) then
    raise exception 'profiles must have an authenticated owner-only SELECT policy';
  end if;

  select reloptions into v_options
  from pg_class where oid = 'public.leaderboard_profiles'::regclass;
  if not coalesce(v_options @> array['security_barrier=true'], false) then
    raise exception 'leaderboard view must retain security_barrier=true';
  end if;
  if coalesce(v_options @> array['security_invoker=true'], false) then
    raise exception 'leaderboard view must not execute with caller privileges';
  end if;

  select array_agg(attname::text order by attnum) into v_columns
  from pg_attribute
  where attrelid = 'public.leaderboard_profiles'::regclass
    and attnum > 0 and not attisdropped;
  if v_columns <> array['id','username','xp','season_xp','level','streak']::text[] then
    raise exception 'leaderboard view projection changed unexpectedly: %', v_columns;
  end if;

  if not has_table_privilege('anon', 'public.leaderboard_profiles', 'SELECT')
     or not has_table_privilege('authenticated', 'public.leaderboard_profiles', 'SELECT') then
    raise exception 'browser roles must retain SELECT on the leaderboard view';
  end if;
  if has_table_privilege('anon', 'public.leaderboard_profiles', 'INSERT')
     or has_table_privilege('anon', 'public.leaderboard_profiles', 'UPDATE')
     or has_table_privilege('anon', 'public.leaderboard_profiles', 'DELETE')
     or has_table_privilege('authenticated', 'public.leaderboard_profiles', 'INSERT')
     or has_table_privilege('authenticated', 'public.leaderboard_profiles', 'UPDATE')
     or has_table_privilege('authenticated', 'public.leaderboard_profiles', 'DELETE') then
    raise exception 'leaderboard view must be read-only for browser roles';
  end if;

  if (select relowner from pg_class where oid = 'public.leaderboard_profiles'::regclass)
     <> (select oid from pg_roles where rolname = 'postgres') then
    raise exception 'leaderboard view owner must remain postgres';
  end if;
end
$$;

-- Runtime isolation check: authenticated user A sees only A's profile.
begin;
insert into public.profiles (id, username, display_name, curriculum_board)
values
  ('11111111-1111-4111-8111-111111111111', 'learner-a', 'Learner A', 'Cambridge'),
  ('22222222-2222-4222-8222-222222222222', 'learner-b', 'Learner B', 'ZIMSEC');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.profiles;
  if v_count <> 1 then
    raise exception 'authenticated owner read expected 1 profile, found %', v_count;
  end if;
end
$$;
reset role;

-- Anonymous callers can read the six-field projection but cannot read profiles.
set local role anon;
do $$
begin
  perform 1 from public.leaderboard_profiles limit 1;
  begin
    perform 1 from public.profiles limit 1;
    raise exception 'anon unexpectedly read public.profiles';
  exception when insufficient_privilege then
    null;
  end;
end
$$;
reset role;
rollback;
