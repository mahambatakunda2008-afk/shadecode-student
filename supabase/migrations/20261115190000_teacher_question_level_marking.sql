-- Question-level marking for structured Teacher Client assessments.
-- Scores are validated against the immutable question mark allocations and aggregated server-side.

alter table public.platform_assignment_submissions
  add column if not exists question_marks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(question_marks) = 'array');

create or replace function public.mark_platform_assignment_submission_questions(
  p_submission_id uuid,
  p_question_marks jsonb,
  p_feedback text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_assignment_id uuid;
  v_group_id uuid;
  v_questions jsonb;
  v_question jsonb;
  v_mark jsonb;
  v_normalized jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_index integer := 0;
  v_awarded numeric;
  v_max numeric;
  v_updated integer;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if coalesce(jsonb_typeof(p_question_marks), '') <> 'array'
    or char_length(coalesce(p_feedback, '')) > 5000 then
    raise exception 'Invalid question marking details' using errcode = '22023';
  end if;

  select a.id, a.group_id, a.questions
    into v_assignment_id, v_group_id, v_questions
  from public.platform_assignment_submissions s
  join public.platform_assignments a on a.id = s.assignment_id
  where s.id = p_submission_id;

  if not found or jsonb_typeof(v_questions) <> 'array'
    or jsonb_array_length(v_questions) = 0
    or jsonb_array_length(p_question_marks) <> jsonb_array_length(v_questions) then
    raise exception 'Question marks must cover every assessment question' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.platform_group_members gm
    where gm.group_id = v_group_id and gm.user_id = v_user
      and gm.status = 'active'
      and gm.membership_role in ('teacher','tutor','administrator','staff')
  ) or (
    exists (
      select 1 from public.platform_groups g
      where g.id = v_group_id and g.institution_id is not null
    ) and not exists (
      select 1 from public.platform_groups g
      join public.platform_institution_members im on im.institution_id = g.institution_id
      where g.id = v_group_id and im.user_id = v_user and im.status = 'active'
        and im.membership_role in ('teacher','tutor','administrator','staff')
    )
  ) then
    raise exception 'Active teaching assignment required' using errcode = '42501';
  end if;

  for v_question, v_mark in
    select q.value, m.value
    from jsonb_array_elements(v_questions) with ordinality q(value, ord)
    join jsonb_array_elements(p_question_marks) with ordinality m(value, ord)
      on m.ord = q.ord
    order by q.ord
  loop
    v_index := v_index + 1;
    if coalesce((v_mark->>'questionNumber')::integer, 0) <> v_index
      or nullif(v_mark->>'marksAwarded', '') is null
      or (v_mark->>'marksAwarded') !~ '^\\d+(\\.\\d{1,2})?$'
      or char_length(coalesce(v_mark->>'feedback', '')) > 2000 then
      raise exception 'Invalid marking for question %', v_index using errcode = '22023';
    end if;

    v_awarded := (v_mark->>'marksAwarded')::numeric;
    v_max := (v_question->>'marks')::numeric;
    if v_awarded < 0 or v_awarded > v_max then
      raise exception 'Marks awarded exceed the allocation for question %', v_index using errcode = '22023';
    end if;

    v_total := v_total + v_awarded;
    v_normalized := v_normalized || jsonb_build_array(jsonb_build_object(
      'questionNumber', v_index,
      'marksAwarded', v_awarded,
      'maxMarks', v_max,
      'feedback', coalesce(v_mark->>'feedback', '')
    ));
  end loop;

  update public.platform_assignment_submissions s
  set question_marks = v_normalized,
      status = 'marked',
      score = v_total,
      feedback = coalesce(p_feedback, ''),
      marked_by = v_user,
      marked_at = now()
  from public.platform_assignments a
  where s.id = p_submission_id
    and a.id = s.assignment_id
    and a.id = v_assignment_id
    and v_total <= a.max_score;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.mark_platform_assignment_submission_questions(uuid,jsonb,text) from public, anon;
grant execute on function public.mark_platform_assignment_submission_questions(uuid,jsonb,text) to authenticated;
