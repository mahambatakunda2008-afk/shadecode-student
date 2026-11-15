-- Teacher attendance: group-scoped sessions and per-learner attendance records.
-- All writes go through SECURITY DEFINER RPCs; authenticated clients are read-only.

create table if not exists public.platform_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.platform_groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  session_date date not null default current_date,
  subject text not null check (char_length(btrim(subject)) between 1 and 120),
  lesson_topic text not null default '' check (char_length(lesson_topic) <= 500),
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists platform_attendance_sessions_group_date_idx
  on public.platform_attendance_sessions(group_id, session_date desc, created_at desc);

create table if not exists public.platform_attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.platform_attendance_sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  attendance_status text not null check (attendance_status in ('present','absent','late','excused')),
  note text not null default '' check (char_length(note) <= 1000),
  recorded_by uuid not null references auth.users(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create index if not exists platform_attendance_records_student_idx
  on public.platform_attendance_records(student_id, recorded_at desc);
create index if not exists platform_attendance_records_session_idx
  on public.platform_attendance_records(session_id);

alter table public.platform_attendance_sessions enable row level security;
alter table public.platform_attendance_records enable row level security;

drop policy if exists "active group members read attendance sessions" on public.platform_attendance_sessions;
create policy "active group members read attendance sessions"
  on public.platform_attendance_sessions for select to authenticated
  using (
    exists (
      select 1 from public.platform_group_members gm
      where gm.group_id = platform_attendance_sessions.group_id
        and gm.user_id = (select auth.uid()) and gm.status = 'active'
    )
  );

drop policy if exists "learners and assigned teachers read attendance records" on public.platform_attendance_records;
create policy "learners and assigned teachers read attendance records"
  on public.platform_attendance_records for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.platform_attendance_sessions s
      join public.platform_group_members gm on gm.group_id = s.group_id
      where s.id = platform_attendance_records.session_id
        and gm.user_id = (select auth.uid()) and gm.status = 'active'
        and gm.membership_role in ('teacher','tutor','administrator','staff')
    )
  );

revoke insert, update, delete on public.platform_attendance_sessions from public, anon, authenticated;
revoke insert, update, delete on public.platform_attendance_records from public, anon, authenticated;
grant select on public.platform_attendance_sessions, public.platform_attendance_records to authenticated;
grant all on public.platform_attendance_sessions, public.platform_attendance_records to service_role;

create or replace function public.create_platform_attendance_session(
  p_group_id uuid,
  p_session_date date default current_date,
  p_subject text default 'General',
  p_lesson_topic text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_group_id is null or p_session_date is null
     or p_subject is null or char_length(btrim(p_subject)) not between 1 and 120
     or char_length(coalesce(p_lesson_topic,'')) > 500 then
    raise exception 'Invalid attendance session details' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.platform_group_members gm
    where gm.group_id = p_group_id and gm.user_id = v_user
      and gm.status = 'active'
      and gm.membership_role in ('teacher','tutor','administrator','staff')
  ) then
    raise exception 'Active teaching assignment required' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.platform_groups g where g.id = p_group_id and g.institution_id is not null
  ) and not exists (
    select 1 from public.platform_groups g
    join public.platform_institution_members im on im.institution_id = g.institution_id
    where g.id = p_group_id and im.user_id = v_user and im.status = 'active'
      and im.membership_role in ('teacher','tutor','administrator','staff')
  ) then
    raise exception 'Active institution teaching membership required' using errcode = '42501';
  end if;
  insert into public.platform_attendance_sessions(group_id,created_by,session_date,subject,lesson_topic)
  values (p_group_id,v_user,p_session_date,btrim(p_subject),coalesce(p_lesson_topic,''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.record_platform_attendance(
  p_session_id uuid,
  p_student_id uuid,
  p_status text,
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_group uuid; v_institution uuid; v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_student_id is null or p_status not in ('present','absent','late','excused')
     or char_length(coalesce(p_note,'')) > 1000 then
    raise exception 'Invalid attendance record' using errcode = '22023';
  end if;
  select s.group_id,g.institution_id into v_group,v_institution
  from public.platform_attendance_sessions s
  join public.platform_groups g on g.id=s.group_id
  where s.id=p_session_id and s.status='open';
  if not found then raise exception 'Attendance session is unavailable or closed' using errcode = '55000'; end if;
  if not exists (
    select 1 from public.platform_group_members gm
    where gm.group_id=v_group and gm.user_id=v_user and gm.status='active'
      and gm.membership_role in ('teacher','tutor','administrator','staff')
  ) then raise exception 'Active teaching assignment required' using errcode = '42501'; end if;
  if v_institution is not null and not exists (
    select 1 from public.platform_institution_members im
    where im.institution_id=v_institution and im.user_id=v_user and im.status='active'
      and im.membership_role in ('teacher','tutor','administrator','staff')
  ) then raise exception 'Active institution teaching membership required' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.platform_group_members gm
    where gm.group_id=v_group and gm.user_id=p_student_id
      and gm.status='active' and gm.membership_role='student'
  ) then raise exception 'Learner is not an active member of this class' using errcode = '42501'; end if;

  insert into public.platform_attendance_records(session_id,student_id,attendance_status,note,recorded_by)
  values (p_session_id,p_student_id,p_status,coalesce(p_note,''),v_user)
  on conflict (session_id,student_id) do update
    set attendance_status=excluded.attendance_status,note=excluded.note,
        recorded_by=excluded.recorded_by,recorded_at=now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.close_platform_attendance_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_updated integer;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.platform_attendance_sessions s
  set status='closed',closed_at=now()
  where s.id=p_session_id and s.status='open'
    and exists (
      select 1 from public.platform_group_members gm
      where gm.group_id=s.group_id and gm.user_id=v_user and gm.status='active'
        and gm.membership_role in ('teacher','tutor','administrator','staff')
    )
    and (
      not exists (select 1 from public.platform_groups g where g.id=s.group_id and g.institution_id is not null)
      or exists (
        select 1 from public.platform_groups g
        join public.platform_institution_members im on im.institution_id=g.institution_id
        where g.id=s.group_id and im.user_id=v_user and im.status='active'
          and im.membership_role in ('teacher','tutor','administrator','staff')
      )
    );
  get diagnostics v_updated=row_count;
  return v_updated=1;
end;
$$;

revoke all on function public.create_platform_attendance_session(uuid,date,text,text) from public,anon;
revoke all on function public.record_platform_attendance(uuid,uuid,text,text) from public,anon;
revoke all on function public.close_platform_attendance_session(uuid) from public,anon;
grant execute on function public.create_platform_attendance_session(uuid,date,text,text) to authenticated;
grant execute on function public.record_platform_attendance(uuid,uuid,text,text) to authenticated;
grant execute on function public.close_platform_attendance_session(uuid) to authenticated;
