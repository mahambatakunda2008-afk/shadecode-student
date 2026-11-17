-- Make generated course approval one durable, idempotent database transaction.
-- This migration is intentionally additive. Apply and fault-test in staging before production.

begin;

-- A draft may be approved only once. If historical duplicate audit rows exist,
-- stop rather than silently deleting audit evidence.
do $$
begin
  if exists (
    select draft_id
    from public.generated_course_approvals
    group by draft_id
    having count(*) > 1
  ) then
    raise exception 'generated_course_approvals contains duplicate draft_id rows; reconcile audit history before applying this migration';
  end if;
end
$$;

create unique index if not exists generated_course_approvals_draft_id_uidx
  on public.generated_course_approvals (draft_id);

create or replace function public.approve_generated_course_draft(
  p_draft_id uuid,
  p_approved_by uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_draft public.generated_course_drafts%rowtype;
  v_subject_id uuid;
  v_subject_name text;
  v_lessons jsonb;
  v_lesson jsonb;
  v_title text;
  v_summary text;
  v_difficulty text;
  v_blocks jsonb;
  v_lesson_id uuid;
  v_prerequisite_title text;
  v_prerequisite_id uuid;
  v_lesson_ids jsonb := '{}'::jsonb;
  v_lesson_count integer := 0;
  v_result jsonb;
begin
  if p_draft_id is null or p_approved_by is null then
    raise exception 'draft id and approver are required' using errcode = '22004';
  end if;

  -- The API verifies the bearer token, and this transaction independently
  -- verifies the actor's current approval permission before touching data.
  if not exists (
    select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
     where ur.user_id = p_approved_by
       and r.permissions->>'approve_drafts' = 'true'
  ) then
    raise exception 'approver does not have approve_drafts permission' using errcode = '42501';
  end if;

  select *
    into v_draft
    from public.generated_course_drafts
   where id = p_draft_id
   for update;

  if not found then
    raise exception 'generated course draft not found' using errcode = 'P0002';
  end if;

  -- A repeated request returns the committed result without creating anything.
  if v_draft.status = 'approved' then
    if not exists (
      select 1 from public.generated_course_approvals
       where draft_id = p_draft_id
    ) then
      raise exception 'draft is marked approved without an approval audit record' using errcode = '55000';
    end if;
    return coalesce(v_draft.result, '{}'::jsonb) || jsonb_build_object('alreadyApproved', true);
  end if;

  if v_draft.status <> 'pending' then
    raise exception 'draft is not pending approval' using errcode = '55000';
  end if;

  if coalesce(jsonb_typeof(v_draft.draft->'lessons'), 'null') <> 'array' then
    raise exception 'draft lessons must be an array' using errcode = '22023';
  end if;

  v_lessons := v_draft.draft->'lessons';
  if jsonb_array_length(v_lessons) < 1 or jsonb_array_length(v_lessons) > 100 then
    raise exception 'draft must contain between 1 and 100 lessons' using errcode = '22023';
  end if;

  v_subject_name := left(
    coalesce(nullif(btrim(v_draft.draft->>'title'), ''), 'Generated Course'),
    60
  );

  select id
    into v_subject_id
    from public.subjects
   where user_id = v_draft.user_id
     and lower(btrim(name)) = lower(v_subject_name)
   limit 1;

  if v_subject_id is null then
    insert into public.subjects (user_id, name)
    values (v_draft.user_id, v_subject_name)
    returning id into v_subject_id;
  end if;

  -- First pass: create every lesson and retain an exact title-to-id map.
  -- Duplicate titles are rejected because prerequisite references would be ambiguous.
  for v_lesson in
    select value from jsonb_array_elements(v_lessons)
  loop
    v_summary := coalesce(v_lesson->>'summary', '');
    v_title := left(coalesce(nullif(btrim(v_lesson->>'title'), ''), nullif(btrim(v_summary), ''), 'Untitled'), 255);
    if v_lesson_ids ? v_title then
      raise exception 'lesson titles must be unique within a generated course' using errcode = '22023';
    end if;

    v_difficulty := case
      when v_lesson->>'difficulty' in ('medium', 'hard') then v_lesson->>'difficulty'
      else 'easy'
    end;

    v_blocks := case
      when jsonb_typeof(v_lesson->'blocks') = 'array' then v_lesson->'blocks'
      else jsonb_build_array(jsonb_build_object('type', 'text', 'content', left(v_summary, 8000)))
    end;

    insert into public.learn_lessons (
      user_id, subject_id, title, description, difficulty, blocks, progress
    ) values (
      v_draft.user_id,
      v_subject_id,
      v_title,
      left(v_summary, 1000),
      v_difficulty,
      v_blocks,
      0
    )
    returning id into v_lesson_id;

    v_lesson_ids := v_lesson_ids || jsonb_build_object(v_title, v_lesson_id::text);
    v_lesson_count := v_lesson_count + 1;
  end loop;

  -- Second pass: link prerequisites only when both titles resolve to lessons
  -- created in this same transaction. Unknown references are ignored, not guessed.
  for v_lesson in
    select value from jsonb_array_elements(v_lessons)
  loop
    v_summary := coalesce(v_lesson->>'summary', '');
    v_title := left(coalesce(nullif(btrim(v_lesson->>'title'), ''), nullif(btrim(v_summary), ''), 'Untitled'), 255);
    v_lesson_id := (v_lesson_ids->>v_title)::uuid;

    if jsonb_typeof(v_lesson->'prerequisites') = 'array' then
      for v_prerequisite_title in
        select value from jsonb_array_elements_text(v_lesson->'prerequisites')
      loop
        v_prerequisite_id := (v_lesson_ids->>left(v_prerequisite_title, 255))::uuid;
        if v_prerequisite_id is not null and v_prerequisite_id <> v_lesson_id then
          insert into public.lesson_prerequisites (lesson_id, prerequisite_lesson_id)
          values (v_lesson_id, v_prerequisite_id)
          on conflict (lesson_id, prerequisite_lesson_id) do nothing;
        end if;
      end loop;
    end if;
  end loop;

  v_result := jsonb_build_object('lessonsInserted', v_lesson_count);

  insert into public.generated_course_approvals (draft_id, approved_by, notes)
  values (p_draft_id, p_approved_by, jsonb_build_object('source', 'admin_api', 'transactional', true));

  update public.generated_course_drafts
     set status = 'approved',
         approved_at = now(),
         approved_by = p_approved_by,
         result = v_result,
         error = null
   where id = p_draft_id;

  return v_result;
end;
$$;

revoke all on function public.approve_generated_course_draft(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_generated_course_draft(uuid, uuid) to service_role;

commit;
