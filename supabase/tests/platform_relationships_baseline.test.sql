-- Run after 20260911112810_create_platform_relationships.sql on disposable PostgreSQL.
-- Checks the recovered baseline's structural and authorization invariants.
begin;
do $$
declare
  v_table text;
  v_expected text[] := array[
    'platform_institutions',
    'platform_institution_members',
    'platform_groups',
    'platform_group_members',
    'platform_user_relationships'
  ];
begin
  foreach v_table in array v_expected loop
    if to_regclass(format('public.%I', v_table)) is null then
      raise exception 'Recovered platform table missing: %', v_table;
    end if;
    if not exists (
      select 1 from pg_class c
      where c.oid = to_regclass(format('public.%I', v_table))
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled on %', v_table;
    end if;
    if not has_table_privilege('anon', format('public.%I', v_table), 'SELECT')
       or not has_table_privilege('authenticated', format('public.%I', v_table), 'SELECT')
       or not has_table_privilege('service_role', format('public.%I', v_table), 'SELECT') then
      raise exception 'Expected API role table grants missing on %', v_table;
    end if;
  end loop;

  if (select count(*) from pg_policies
      where schemaname = 'public'
        and tablename = any(v_expected)
        and cmd = 'SELECT') <> 5 then
    raise exception 'Expected exactly five read policies on platform tables';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = any(v_expected)
      and cmd <> 'SELECT'
  ) then
    raise exception 'Recovered baseline unexpectedly contains a write policy';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.platform_user_relationships'::regclass
      and conname = 'platform_user_relationships_subject_user_id_related_user_id_key'
      and contype = 'u'
  ) then
    raise exception 'Relationship uniqueness constraint missing';
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.platform_group_members'::regclass
      and conname = 'platform_group_members_group_id_fkey'
  ) then
    raise exception 'Group membership foreign key missing';
  end if;
end $$;
rollback;
