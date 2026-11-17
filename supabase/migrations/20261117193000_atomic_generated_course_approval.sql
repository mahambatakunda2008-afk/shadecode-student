-- Make generated-course approval one atomic, retry-safe database transaction.
-- Existing duplicate audit rows must be reconciled explicitly before this migration
-- can be applied; this migration never discards historical approval evidence.

begin;

do $$
begin
  if exists (
    select 1
    from public.generated_course_approvals
    group by draft_id
    having count(*) > 1
  ) then
    raise exception 'generated_course_approvals contains duplicate draft_id rows; reconcile audit history before applying this migration';
  end if;
end;
$$;

create unique index if not exists generated_course_approvals_one_per_draft
  on public.generated_course_approvals(draft_id);

create or replace function public.approve_generated_course_draft(
  p_draft_id uuid,
  p_approved_by uuid
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid;
  v_draft jsonb;
  v_status text;
  v_existing_result jsonb;
  v_subject_name text;
  v_subject_id uuid;
  v_lesson jsonb;
  v_prerequisite text;
  v_lesson_id uuid;
  v_lesson_ids uuid[] := array[]::uuid[];
  v_titles text[] := array[]::text[];
  v_lesson_index integer;
  v_prerequisite_index integer;
  v_result jsonb;
begin
  if p_approved_by is null
     or not public.has_permission(p_approved_by, 'approve_drafts'::text) then
    raise exception 'insufficient_permission' using errcode = '42501';
  end if;

  select user_id, draft, status, result
    into v_user_id, v_draft, v_status, v_existing_result
  from public.generated_course_drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'draft_not_found' using errcode = 'P0002';
  end if;

  -- Idempotent replay: the row lock serializes concurrent approval attempts.
  if v_status = 'approved' then
    if not exists (
      select 1 from public.generated_course_approvals
      where draft_id = p_draft_id
    ) then
      raise exception 'draft_approval_audit_inconsistent' using errcode = 'P0001';
    end if;
    return jsonb_build_object(
      'ok', true,
      'alreadyApproved', true,
      'result', coalesce(v_existing_result, '{}'::jsonb)
    );
  end if;

  if v_status <> 'pending' then
    raise exception 'draft_not_pending' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.generated_course_approvals
    where draft_id = p_draft_id
  ) then
    raise exception 'draft_approval_audit_inconsistent' using errcode = 'P0001';
  end if;

  if v_user_id is null or v_draft is null or jsonb_typeof(v_draft) <> 'object' then
    raise exception 'invalid_course_draft' using errcode = '22023';
  end if;

  if jsonb_typeof(v_draft->'lessons') is distinct from 'array' then
    raise exception 'course_draft_lessons_must_be_an_array' using errcode = '22023';
  end if;
  if jsonb_array_length(v_draft->'lessons') < 1
     or jsonb_array_length(v_draft->'lessons') > 50 then
    raise exception 'course_draft_must_contain_1_to_50_lessons' using errcode = '22023';
  end if;

  -- Serialize approvals for one learner so two different drafts cannot race
  -- while creating the same subject.
  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  v_subject_name := left(
    coalesce(nullif(trim(v_draft->>'title'), ''), 'Generated Course'),
    60
  );

  select id into v_subject_id
  from public.subjects
  where user_id = v_user_id and name = v_subject_name
  limit 1;

  if v_subject_id is null then
    insert into public.subjects(user_id, name)
    values (v_user_id, v_subject_name)
    returning id into v_subject_id;
  end if;

  -- Prerequisites are represented by lesson titles in the draft payload.
  -- Reject duplicate titles rather than silently linking to the wrong lesson.
  if exists (
    select 1
    from jsonb_array_elements(v_draft->'lessons') as item(value)
    group by lower(left(coalesce(
      nullif(trim(item.value->>'title'), ''),
      nullif(trim(item.value->>'summary'), ''),
      'Untitled'
    ), 255))
    having count(*) > 1
  ) then
    raise exception 'course_draft_contains_duplicate_lesson_titles' using errcode = '22023';
  end if;

  for v_lesson, v_lesson_index in
    select value, ordinality::integer
    from jsonb_array_elements(v_draft->'lessons') with ordinality
  loop
    if jsonb_typeof(v_lesson) <> 'object' then
      raise exception 'invalid_lesson_at_index_%', v_lesson_index using errcode = '22023';
    end if;

    insert into public.learn_lessons(
      user_id, subject_id, title, description, difficulty, blocks, progress
    ) values (
      v_user_id,
      v_subject_id,
      left(coalesce(nullif(trim(v_lesson->>'title'), ''), nullif(trim(v_lesson->>'summary'), ''), 'Untitled'), 255),
      left(coalesce(v_lesson->>'summary', ''), 1000),
      case
        when v_lesson->>'difficulty' = 'hard' then 'hard'
        when v_lesson->>'difficulty' = 'medium' then 'medium'
        else 'easy'
      end,
      case
        when jsonb_typeof(v_lesson->'blocks') = 'array' then v_lesson->'blocks'
        else jsonb_build_array(jsonb_build_object('type', 'text', 'content', coalesce(v_lesson->>'summary', '')))
      end,
      0
    ) returning id into v_lesson_id;

    v_lesson_ids := array_append(v_lesson_ids, v_lesson_id);
    v_titles := array_append(v_titles, left(coalesce(
      nullif(trim(v_lesson->>'title'), ''),
      nullif(trim(v_lesson->>'summary'), ''),
      'Untitled'
    ), 255));
  end loop;

  for v_lesson, v_lesson_index in
    select value, ordinality::integer
    from jsonb_array_elements(v_draft->'lessons') with ordinality
  loop
    if jsonb_typeof(v_lesson->'prerequisites') = 'array' then
      for v_prerequisite in
        select value from jsonb_array_elements_text(v_lesson->'prerequisites')
      loop
        v_prerequisite_index := array_position(v_titles, left(trim(v_prerequisite), 255));
        if v_prerequisite_index is null then
          raise exception 'unknown_prerequisite_%_for_lesson_%', v_prerequisite, v_lesson_index using errcode = '22023';
        end if;
        if v_prerequisite_index = v_lesson_index then
          raise exception 'lesson_cannot_be_its_own_prerequisite' using errcode = '22023';
        end if;

        insert into public.lesson_prerequisites(lesson_id, prerequisite_lesson_id)
        values (v_lesson_ids[v_lesson_index], v_lesson_ids[v_prerequisite_index])
        on conflict (lesson_id, prerequisite_lesson_id) do nothing;
      end loop;
    end if;
  end loop;

  v_result := jsonb_build_object(
    'lessonsInserted', cardinality(v_lesson_ids),
    'subjectId', v_subject_id
  );

  insert into public.generated_course_approvals(draft_id, approved_by, notes)
  values (p_draft_id, p_approved_by, jsonb_build_object('source', 'admin_api'));

  update public.generated_course_drafts
  set status = 'approved',
      approved_at = now(),
      approved_by = p_approved_by,
      result = v_result,
      error = null
  where id = p_draft_id;

  return jsonb_build_object('ok', true, 'alreadyApproved', false, 'result', v_result);
end;
$$;

revoke all on function public.approve_generated_course_draft(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_generated_course_draft(uuid, uuid) to service_role;

commit;
