-- Functional security tests for the institution lifecycle RPCs.
-- Run after the platform baseline and institution lifecycle migrations on disposable PostgreSQL.
begin;

-- Minimal profile fixture for the authorized roster display-name projection.
create table if not exists public.profiles (
  id uuid primary key,
  username text,
  display_name text
);
insert into public.profiles(id,username,display_name) values
 ('10000000-0000-4000-8000-000000000001','schooladmin','School Administrator'),
 ('10000000-0000-4000-8000-000000000002','teacherone','Teacher One'),
 ('10000000-0000-4000-8000-000000000003','studentone','Student One')
on conflict (id) do update set username=excluded.username,display_name=excluded.display_name;

create table if not exists public.test_platform_admins(user_id uuid primary key);
create or replace function public.has_role(user_id uuid, role_name text)
returns boolean language sql stable security definer
set search_path=public,pg_temp
as $$
  select role_name='admin' and exists(select 1 from public.test_platform_admins a where a.user_id=$1);
$$;

create or replace function public.test_platform_audit_count(p_institution_id uuid)
returns integer language sql stable security definer
set search_path=public,pg_temp
as $audit$ select count(*)::integer from public.platform_membership_audit where institution_id=$1 $audit$;
grant execute on function public.test_platform_audit_count(uuid) to authenticated;

insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000003')
on conflict do nothing;
insert into public.test_platform_admins(user_id)
values ('10000000-0000-4000-8000-000000000001') on conflict do nothing;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);

do $$
declare
  v_institution uuid;
  v_group uuid;
  v_teacher_invite uuid;
  v_student_invite uuid;
  v_code_teacher text := 'teacher-invite-code-2026-functional';
  v_code_student text := 'student-invite-code-2026-functional';
  v_code_student_retry text := 'student-invite-retry-2026-functional';
  v_result jsonb;
  v_roster_count integer;
begin
  v_institution := public.create_platform_institution('Fixture School','school','ZW');
  v_group := public.create_platform_group(v_institution,'Form 5A','class',null);

  v_teacher_invite := public.create_platform_institution_invite(
    v_institution,encode(sha256(convert_to(v_code_teacher,'utf8')),'hex'),'teacher',v_group,now()+interval '7 days'
  );
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  v_result := public.redeem_platform_institution_invite(v_code_teacher);
  if v_result->>'institution_id' <> v_institution::text or v_result->>'group_id' <> v_group::text then
    raise exception 'teacher invite returned incorrect tenant scope';
  end if;
  if not exists(select 1 from public.platform_institution_members where institution_id=v_institution and user_id=auth.uid() and membership_role='teacher' and status='active') then
    raise exception 'teacher institution membership not created';
  end if;
  if not exists(select 1 from public.platform_group_members where group_id=v_group and user_id=auth.uid() and membership_role='teacher' and status='active') then
    raise exception 'teacher group membership not created';
  end if;
  select count(*) into v_roster_count from public.list_platform_group_roster(v_group);
  if v_roster_count <> 1 then
    raise exception 'teacher should see the active roster for their assigned group';
  end if;
  if not exists (
    select 1 from public.list_platform_group_roster(v_group)
    where user_id='10000000-0000-4000-8000-000000000002'
      and display_name='Teacher One'
  ) then
    raise exception 'authorized class roster did not resolve the member display name';
  end if;

  begin
    perform public.redeem_platform_institution_invite(v_code_teacher);
    raise exception 'single-use teacher invite was redeemed twice';
  exception when sqlstate '22023' then
    null;
  end;

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  v_student_invite := public.create_platform_institution_invite(
    v_institution,encode(sha256(convert_to(v_code_student,'utf8')),'hex'),'student',v_group,now()+interval '7 days'
  );
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  perform public.redeem_platform_institution_invite(v_code_student);

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  select count(*) into v_roster_count from public.list_platform_group_roster(v_group);
  if v_roster_count <> 2 then
    raise exception 'assigned teacher should see both active teacher and student roster entries';
  end if;
  begin
    perform public.set_platform_membership_status(v_institution,'10000000-0000-4000-8000-000000000003','suspended',v_group);
    raise exception 'ordinary teacher changed another learner membership';
  exception when sqlstate '42501' then
    null;
  end;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  begin
    perform * from public.list_platform_group_roster(v_group);
    raise exception 'student accessed teacher-only roster endpoint';
  exception when sqlstate '42501' then
    null;
  end;

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  begin
    perform public.set_platform_membership_status(v_institution,'10000000-0000-4000-8000-000000000001','revoked',null);
    raise exception 'last active institution administrator was revoked';
  exception when sqlstate '23514' then
    null;
  end;

  perform public.set_platform_membership_status(v_institution,'10000000-0000-4000-8000-000000000003','suspended',null);
  begin
    perform public.set_platform_membership_status(v_institution,'10000000-0000-4000-8000-000000000003','active',v_group);
    raise exception 'group access was restored while institution membership was suspended';
  exception when sqlstate '42501' then
    null;
  end;

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
  select count(*) into v_roster_count from public.list_platform_group_roster(v_group);
  if v_roster_count <> 1 then
    raise exception 'suspended student remained visible in the active roster';
  end if;
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  if exists(select 1 from public.platform_group_members where group_id=v_group and user_id=auth.uid() and status='active') then
    raise exception 'institution suspension did not cascade to group access';
  end if;

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  perform public.create_platform_institution_invite(
    v_institution,encode(sha256(convert_to(v_code_student_retry,'utf8')),'hex'),'student',v_group,now()+interval '7 days'
  );
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  begin
    perform public.redeem_platform_institution_invite(v_code_student_retry);
    raise exception 'new invite bypassed an existing suspended institution membership';
  exception when sqlstate '42501' then
    null;
  end;

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  perform public.set_platform_membership_status(v_institution,'10000000-0000-4000-8000-000000000003','active',null);
  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  if exists(select 1 from public.platform_group_members where group_id=v_group and user_id=auth.uid() and status='active') then
    raise exception 'institution reinstatement silently restored group access';
  end if;

  begin
    perform public.create_platform_group(v_institution,'Unauthorized class','class',null);
    raise exception 'non-administrator created a group';
  exception when sqlstate '42501' then
    null;
  end;

  if public.test_platform_audit_count(v_institution) < 6 then
    raise exception 'expected lifecycle audit events were not written';
  end if;
end $$;

rollback;
