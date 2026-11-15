-- Teacher classwork: institution-scoped assignments, learner submissions and teacher marking.
-- All writes go through authorization-checking RPCs; authenticated clients receive read-only table grants.

create table if not exists public.platform_assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.platform_groups(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 180),
  subject text not null check (char_length(btrim(subject)) between 1 and 120),
  instructions text not null default '' check (char_length(instructions) <= 12000),
  due_at timestamptz,
  max_score numeric(8,2) not null default 100 check (max_score > 0 and max_score <= 100000),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_assignments_group_created_idx
  on public.platform_assignments(group_id, created_at desc);

create table if not exists public.platform_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.platform_assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  response text not null check (char_length(response) <= 30000),
  submitted_at timestamptz not null default now(),
  status text not null default 'submitted' check (status in ('submitted','marked')),
  score numeric(8,2),
  feedback text,
  marked_by uuid references auth.users(id) on delete set null,
  marked_at timestamptz,
  unique (assignment_id, student_id),
  check (
    (status = 'submitted' and score is null and marked_by is null and marked_at is null)
    or
    (status = 'marked' and score is not null and marked_by is not null and marked_at is not null)
  )
);

create index if not exists platform_assignment_submissions_student_idx
  on public.platform_assignment_submissions(student_id, submitted_at desc);
create index if not exists platform_assignment_submissions_assignment_idx
  on public.platform_assignment_submissions(assignment_id, submitted_at desc);

alter table public.platform_assignments enable row level security;
alter table public.platform_assignment_submissions enable row level security;

drop policy if exists "active group members read assignments" on public.platform_assignments;
create policy "active group members read assignments"
  on public.platform_assignments for select to authenticated
  using (
    exists (
      select 1 from public.platform_group_members gm
      where gm.group_id = platform_assignments.group_id
        and gm.user_id = (select auth.uid())
        and gm.status = 'active'
    )
    and (
      status <> 'draft'
      or created_by = (select auth.uid())
      or exists (
        select 1 from public.platform_group_members gm
        where gm.group_id = platform_assignments.group_id
          and gm.user_id = (select auth.uid())
          and gm.status = 'active'
          and gm.membership_role in ('teacher','tutor','administrator','staff')
      )
    )
  );

drop policy if exists "students and assigned teachers read submissions" on public.platform_assignment_submissions;
create policy "students and assigned teachers read submissions"
  on public.platform_assignment_submissions for select to authenticated
  using (
    student_id = (select auth.uid())
    or exists (
      select 1
      from public.platform_assignments a
      join public.platform_group_members gm on gm.group_id = a.group_id
      where a.id = platform_assignment_submissions.assignment_id
        and gm.user_id = (select auth.uid())
        and gm.status = 'active'
        and gm.membership_role in ('teacher','tutor','administrator','staff')
    )
  );

revoke insert, update, delete on public.platform_assignments from public, anon, authenticated;
revoke insert, update, delete on public.platform_assignment_submissions from public, anon, authenticated;
grant select on public.platform_assignments, public.platform_assignment_submissions to authenticated;
grant all on public.platform_assignments, public.platform_assignment_submissions to service_role;

create or replace function public.create_platform_assignment(
  p_group_id uuid,
  p_title text,
  p_subject text,
  p_instructions text default '',
  p_due_at timestamptz default null,
  p_max_score numeric default 100,
  p_publish boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_group_id is null or p_title is null or char_length(btrim(p_title)) not between 3 and 180
     or p_subject is null or char_length(btrim(p_subject)) not between 1 and 120
     or char_length(coalesce(p_instructions,'')) > 12000
     or p_max_score is null or p_max_score <= 0 or p_max_score > 100000 then
    raise exception 'Invalid assignment details' using errcode = '22023';
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
    select 1 from public.platform_groups g
    where g.id = p_group_id and g.institution_id is not null
  ) and not exists (
    select 1 from public.platform_groups g
    join public.platform_institution_members im on im.institution_id = g.institution_id
    where g.id = p_group_id and im.user_id = v_user and im.status = 'active'
      and im.membership_role in ('teacher','tutor','administrator','staff')
  ) then
    raise exception 'Active institution teaching membership required' using errcode = '42501';
  end if;

  insert into public.platform_assignments(group_id, created_by, title, subject, instructions, due_at, max_score, status)
  values (p_group_id, v_user, btrim(p_title), btrim(p_subject), coalesce(p_instructions,''), p_due_at, p_max_score,
    case when coalesce(p_publish,false) then 'published' else 'draft' end)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.publish_platform_assignment(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_updated integer;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.platform_assignments a
  set status = 'published', updated_at = now()
  where a.id = p_assignment_id
    and a.status = 'draft'
    and exists (
      select 1 from public.platform_group_members gm
      where gm.group_id = a.group_id and gm.user_id = v_user and gm.status = 'active'
        and gm.membership_role in ('teacher','tutor','administrator','staff')
    )
    and (
      not exists (select 1 from public.platform_groups g where g.id = a.group_id and g.institution_id is not null)
      or exists (
        select 1 from public.platform_groups g
        join public.platform_institution_members im on im.institution_id = g.institution_id
        where g.id = a.group_id and im.user_id = v_user and im.status = 'active'
          and im.membership_role in ('teacher','tutor','administrator','staff')
      )
    );
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.submit_platform_assignment(
  p_assignment_id uuid,
  p_response text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_group uuid; v_due timestamptz; v_status text; v_id uuid;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_response is null or char_length(p_response) > 30000 then
    raise exception 'Invalid submission response' using errcode = '22023';
  end if;
  select a.group_id, a.due_at, a.status into v_group, v_due, v_status
  from public.platform_assignments a where a.id = p_assignment_id;
  if not found or v_status <> 'published' then
    raise exception 'Assignment is not available' using errcode = '42501';
  end if;
  if v_due is not null and now() > v_due then
    raise exception 'Assignment deadline has passed' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.platform_group_members gm
    where gm.group_id = v_group and gm.user_id = v_user
      and gm.status = 'active' and gm.membership_role = 'student'
  ) then
    raise exception 'Active student membership required' using errcode = '42501';
  end if;
  insert into public.platform_assignment_submissions(assignment_id, student_id, response)
  values (p_assignment_id, v_user, p_response)
  on conflict (assignment_id, student_id) do update
    set response = excluded.response, submitted_at = now()
    where public.platform_assignment_submissions.status = 'submitted'
  returning id into v_id;
  if v_id is null then
    raise exception 'Submission has already been marked and is locked' using errcode = '55000';
  end if;
  return v_id;
end;
$$;

create or replace function public.mark_platform_assignment_submission(
  p_submission_id uuid,
  p_score numeric,
  p_feedback text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user uuid := auth.uid(); v_updated integer;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_score is null or p_score < 0 or char_length(coalesce(p_feedback,'')) > 5000 then
    raise exception 'Invalid marking details' using errcode = '22023';
  end if;
  update public.platform_assignment_submissions s
  set status = 'marked', score = p_score, feedback = coalesce(p_feedback,''),
      marked_by = v_user, marked_at = now()
  from public.platform_assignments a
  where s.id = p_submission_id and a.id = s.assignment_id
    and p_score <= a.max_score
    and exists (
      select 1 from public.platform_group_members gm
      where gm.group_id = a.group_id and gm.user_id = v_user and gm.status = 'active'
        and gm.membership_role in ('teacher','tutor','administrator','staff')
    )
    and (
      not exists (select 1 from public.platform_groups g where g.id = a.group_id and g.institution_id is not null)
      or exists (
        select 1 from public.platform_groups g
        join public.platform_institution_members im on im.institution_id = g.institution_id
        where g.id = a.group_id and im.user_id = v_user and im.status = 'active'
          and im.membership_role in ('teacher','tutor','administrator','staff')
      )
    );
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.create_platform_assignment(uuid,text,text,text,timestamptz,numeric,boolean) from public, anon;
revoke all on function public.publish_platform_assignment(uuid) from public, anon;
revoke all on function public.submit_platform_assignment(uuid,text) from public, anon;
revoke all on function public.mark_platform_assignment_submission(uuid,numeric,text) from public, anon;
grant execute on function public.create_platform_assignment(uuid,text,text,text,timestamptz,numeric,boolean) to authenticated;
grant execute on function public.publish_platform_assignment(uuid) to authenticated;
grant execute on function public.submit_platform_assignment(uuid,text) to authenticated;
grant execute on function public.mark_platform_assignment_submission(uuid,numeric,text) to authenticated;
