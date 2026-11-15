-- Functional security tests for the institution lifecycle RPCs.
-- Run after the platform baseline and institution lifecycle migrations on disposable PostgreSQL.
begin;

create table if not exists public.test_platform_admins(user_id uuid primary key);
create or replace function public.has_role(user_id uuid, role_name text)
returns boolean language sql stable security definer
set search_path=public,pg_temp
as $$
  select role_name='admin' and exists(select 1 from public.test_platform_admins a where a.user_id=has_role.user_id);
$$;

insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000001'),
 ('10000000-0000-4000-8000-000000000002'),
 ('10000000-0000-4000-8000-000000000003')
on conflict do nothing;
insert into public.test_platform_admins(user_id)
values ('10000000-0000-4000-8000-000000000001') on conflict do nothing;

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
  v_result jsonb;
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

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
  perform public.set_platform_membership_status(v_institution,'10000000-0000-4000-8000-000000000003','suspended',null);
  if exists(select 1 from public.platform_group_members where group_id=v_group and user_id='10000000-0000-4000-8000-000000000003' and status='active') then
    raise exception 'institution suspension did not cascade to group access';
  end if;
  perform public.set_platform_membership_status(v_institution,'10000000-0000-4000-8000-000000000003','active',null);
  if exists(select 1 from public.platform_group_members where group_id=v_group and user_id='10000000-0000-4000-8000-000000000003' and status='active') then
    raise exception 'institution reinstatement silently restored group access';
  end if;

  perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
  begin
    perform public.create_platform_group(v_institution,'Unauthorized class','class',null);
    raise exception 'non-administrator created a group';
  exception when sqlstate '42501' then
    null;
  end;

  if (select count(*) from public.platform_membership_audit where institution_id=v_institution) < 6 then
    raise exception 'expected lifecycle audit events were not written';
  end if;
end $$;

rollback;
