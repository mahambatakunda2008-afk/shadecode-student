-- Disposable PostgreSQL only. Requires platform baseline and institution lifecycle migrations.
begin;

insert into auth.users(id) values
 ('21000000-0000-4000-8000-000000000001'),
 ('21000000-0000-4000-8000-000000000002'),
 ('21000000-0000-4000-8000-000000000003')
on conflict do nothing;

insert into public.platform_institutions(id,name,institution_type,country_code)
values ('31000000-0000-4000-8000-000000000001','Attendance Fixture School','school','ZW')
on conflict do nothing;
insert into public.platform_groups(id,institution_id,name,group_type)
values ('41000000-0000-4000-8000-000000000001','31000000-0000-4000-8000-000000000001','Form 6A','class')
on conflict do nothing;
insert into public.platform_institution_members(institution_id,user_id,membership_role,status)
values
 ('31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','teacher','active'),
 ('31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','student','active'),
 ('31000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000003','student','active')
on conflict do nothing;
insert into public.platform_group_members(group_id,user_id,membership_role,status)
values
 ('41000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','teacher','active'),
 ('41000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000002','student','active')
on conflict do nothing;

set local role authenticated;
select set_config('request.jwt.claim.sub','21000000-0000-4000-8000-000000000001',true);
do $teacher$
declare v_session uuid; v_student uuid := '21000000-0000-4000-8000-000000000002';
begin
  v_session := public.create_platform_attendance_session(
    '41000000-0000-4000-8000-000000000001',current_date,'Physics','Waves practical'
  );
  perform set_config('test.attendance_session_id',v_session::text,true);
  perform public.record_platform_attendance(v_session,v_student,'present','On time');
  perform public.record_platform_attendance(v_session,v_student,'late','Corrected after register check');
  if not exists(select 1 from public.platform_attendance_records where session_id=v_session and student_id=v_student and attendance_status='late') then
    raise exception 'teacher could not correct attendance';
  end if;
  if public.close_platform_attendance_session(v_session) is not true then
    raise exception 'teacher could not close attendance session';
  end if;
  begin
    perform public.record_platform_attendance(v_session,v_student,'absent','');
    raise exception 'closed session accepted a changed attendance record';
  exception when sqlstate '55000' then null;
  end;
end
$teacher$;

select set_config('request.jwt.claim.sub','21000000-0000-4000-8000-000000000002',true);
do $student$
begin
  if not exists(
    select 1 from public.platform_attendance_records
    where session_id=current_setting('test.attendance_session_id')::uuid
      and student_id=auth.uid() and attendance_status='late'
  ) then raise exception 'learner cannot read own attendance'; end if;
  if exists(
    select 1 from public.platform_attendance_records
    where student_id='21000000-0000-4000-8000-000000000003'
  ) then raise exception 'learner can read another learner attendance'; end if;
end
$student$;

rollback;
