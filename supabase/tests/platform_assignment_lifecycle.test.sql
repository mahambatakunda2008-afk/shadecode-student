-- Run after the platform relationship baseline and assignment lifecycle migration.
-- Disposable PostgreSQL only. Exercises teacher creation, student submission, marking and row isolation.
begin;

insert into auth.users(id) values
 ('20000000-0000-4000-8000-000000000001'),
 ('20000000-0000-4000-8000-000000000002'),
 ('20000000-0000-4000-8000-000000000003')
on conflict do nothing;

insert into public.platform_institutions(id,name,institution_type,country_code)
values ('30000000-0000-4000-8000-000000000001','Assignment Fixture School','school','ZW')
on conflict do nothing;
insert into public.platform_groups(id,institution_id,name,group_type)
values ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Form 5A','class')
on conflict do nothing;
insert into public.platform_institution_members(institution_id,user_id,membership_role,status)
values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','teacher','active'),
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','student','active'),
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','student','active')
on conflict do nothing;
insert into public.platform_group_members(group_id,user_id,membership_role,status)
values
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','teacher','active'),
 ('40000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','student','active')
on conflict do nothing;

grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);

do $teacher$
declare v_assignment uuid;
begin
  v_assignment := public.create_platform_assignment(
    '40000000-0000-4000-8000-000000000001',
    'Functions practice','Mathematics','Complete questions 1 to 5.',now()+interval '2 days',40,true
  );
  perform set_config('test.assignment_id',v_assignment::text,true);
  if not exists(select 1 from public.platform_assignments where id=v_assignment and status='published') then
    raise exception 'teacher could not read the published assignment';
  end if;
  begin
    perform public.create_platform_assignment(
      '40000000-0000-4000-8000-000000000001','x','Mathematics','',null,10,false
    );
    raise exception 'invalid assignment title was accepted';
  exception when sqlstate '22023' then null;
  end;
end
$teacher$;

select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
do $student$
declare v_assignment uuid; v_submission uuid;
begin
  v_assignment := current_setting('test.assignment_id')::uuid;
  if (select count(*) from public.platform_assignments where id=v_assignment) <> 1 then
    raise exception 'assigned student cannot read published classwork';
  end if;
  v_submission := public.submit_platform_assignment(v_assignment,'My worked response');
  if not exists(select 1 from public.platform_assignment_submissions where id=v_submission and student_id=auth.uid()) then
    raise exception 'student cannot read their own submission';
  end if;
  if exists(select 1 from public.platform_assignment_submissions where student_id='20000000-0000-4000-8000-000000000003') then
    raise exception 'student can read another learner submission';
  end if;
end
$student$;

select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',true);
do $marking$
declare v_submission uuid;
begin
  select id into v_submission from public.platform_assignment_submissions
  where assignment_id=current_setting('test.assignment_id')::uuid
    and student_id='20000000-0000-4000-8000-000000000002';
  if not public.mark_platform_assignment_submission(v_submission,32,'Good method. Check the final unit.') then
    raise exception 'assigned teacher could not mark learner submission';
  end if;
  if not exists(select 1 from public.platform_assignment_submissions where id=v_submission and status='marked' and score=32 and marked_by=auth.uid()) then
    raise exception 'marking result was not persisted';
  end if;
  if public.mark_platform_assignment_submission(v_submission,99,'Too high') then
    raise exception 'score above assignment maximum was accepted';
  end if;
end
$marking$;

rollback;
