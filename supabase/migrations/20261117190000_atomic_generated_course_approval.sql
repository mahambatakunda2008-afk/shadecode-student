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

-- Drafts must carry an explicit institution identity before institution-level
-- administrators can approve them. Legacy/unscoped drafts remain global-admin only.
alter table public.generated_course_drafts
  add column if not exists institution_id uuid
  references public.platform_institutions(id) on delete set null;

create index if not exists generated_course_drafts_institution_id_idx
  on public.generated_course_drafts (institution_id);

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
  v_lesson_titles text[] := array[]::text[];
  v_lesson_index integer;
  v_prerequisite_index integer;
  v_lesson_count integer := 0;
  v_result jsonb;
  v_has_approval_permission boolean;
  v_is_global_admin boolean;
begin
  if p_draft_id is null or p_approved_by is null then
    raise exception 'draft id and approver are required' using errcode = '22004';
  end if;

  select *
    into v_draft
    from public.generated_course_drafts
   where id = p_draft_id
   for update;

  if not found then
    raise exception 'generated course draft not found' using errcode = 'P0002';
  end if;

  -- Check the draft owner's institution relationship as well as the approver's.
  -- A global administrator can approve across institutions, but cannot attach a
  -- learner who is not an active member of the draft's institution.
  if v_draft.institution_id is not null and not exists (
    select 1
      from public.platform_institution_members owner_membership
     where owner_membership.institution_id = v_draft.institution_id
       and owner_membership.user_id = v_draft.user_id
       and owner_membership.status = 'active'
  ) then
    raise exception 'draft owner is not an active member of this institution' using errcode = '42501';
  end if;

  -- The API verifies the bearer token, and this transaction independently
  -- verifies the actor's current approval permission after locking the draft.
  select
    coalesce(bool_or(r.permissions->>'approve_drafts' = 'true'), false),
    coalesce(bool_or(r.name = 'admin' and r.permissions->>'approve_drafts' = 'true'), false)
    into v_has_approval_permission, v_is_global_admin
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
   where ur.user_id = p_approved_by;

  if not v_has_approval_permission then
    raise exception 'approver does not have approve_drafts permission' using errcode = '42501';
  end if;

  if v_draft.institution_id is null then
    if not v_is_global_admin then
      raise exception 'unscoped drafts require a global administrator' using errcode = '42501';
    end if;
  elsif not v_is_global_admin and not exists (
    select 1
      from public.platform_institution_members m
     where m.institution_id = v_draft.institution_id
       and m.user_id = p_approved_by
       and m.membership_role = 'administrator'
       and m.status = 'active'
  ) then
    raise exception 'approver is not an active administrator of this institution' using errcode = '42501';
  end if;

  -- A repeated request returns the committed result without creating anything.
  if v_draft.status = 'approved' then
    if not exists (
      select 1 from public.generated_course_approvals
       where draft_id = p_draft_id
         and approved_by = v_draft.approved_by
    ) then
      raise exception 'draft is marked approved without a matching approval audit record' using errcode = '55000';
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

  -- Serialize approvals for one learner so separate drafts cannot race while
  -- resolving or creating the same subject.
  perform pg_advisory_xact_lock(hashtextextended(v_draft.user_id::text, 0));

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
    if jsonb_typeof(v_lesson) <> 'object' then
      raise exception 'each generated lesson must be an object' using errcode = '22023';
    end if;

    v_summary := coalesce(v_lesson->>'summary', '');
    if nullif(btrim(v_lesson->>'title'), '') is null and nullif(btrim(v_summary), '') is null then
      raise exception 'each generated lesson needs a title or summary' using errcode = '22023';
    end if;
    v_title := left(coalesce(nullif(btrim(v_lesson->>'title'), ''), nullif(btrim(v_summary), ''), 'Untitled'), 255);
    if v_lesson_ids ? lower(v_title) then
      raise exception 'lesson titles must be unique within a generated course (case-insensitive)' using errcode = '22023';
    end if;

    v_difficulty := case
      when v_lesson->>'difficulty' in ('medium', 'hard') then v_lesson->>'difficulty'
      else 'easy'
    end;

    if jsonb_typeof(v_lesson->'blocks') = 'array'
       and jsonb_array_length(v_lesson->'blocks') > 0 then
      v_blocks := v_lesson->'blocks';
    elsif nullif(btrim(v_summary), '') is not null then
      v_blocks := jsonb_build_array(jsonb_build_object('type', 'text', 'content', left(v_summary, 8000)));
    else
      raise exception 'lesson % needs content blocks or a non-empty summary', v_title using errcode = '22023';
    end if;

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

    v_lesson_ids := v_lesson_ids || jsonb_build_object(lower(v_title), v_lesson_id::text);
    v_lesson_titles := array_append(v_lesson_titles, lower(v_title));
    v_lesson_count := v_lesson_count + 1;
  end loop;

  -- Second pass: link prerequisites only when both titles resolve to lessons
  -- created in this same transaction. Unknown or self-referential links abort the transaction.
  for v_lesson, v_lesson_index in
    select value, ordinality::integer
      from jsonb_array_elements(v_lessons) with ordinality
  loop
    v_summary := coalesce(v_lesson->>'summary', '');
    v_title := left(coalesce(nullif(btrim(v_lesson->>'title'), ''), nullif(btrim(v_summary), ''), 'Untitled'), 255);
    v_lesson_id := (v_lesson_ids->>lower(v_title))::uuid;

    if jsonb_typeof(v_lesson->'prerequisites') = 'array' then
      for v_prerequisite_title in
        select value from jsonb_array_elements_text(v_lesson->'prerequisites')
      loop
        v_prerequisite_index := array_position(v_lesson_titles, lower(left(btrim(v_prerequisite_title), 255)));
        if v_prerequisite_index is null then
          raise exception 'unknown prerequisite % for lesson %', v_prerequisite_title, v_title using errcode = '22023';
        end if;
        if v_prerequisite_index >= v_lesson_index then
          raise exception 'prerequisite % must appear before lesson %', v_prerequisite_title, v_title using errcode = '22023';
        end if;
        v_prerequisite_id := (v_lesson_ids->>lower(left(btrim(v_prerequisite_title), 255)))::uuid;
        if v_prerequisite_id is null then
          raise exception 'unknown prerequisite % for lesson %', v_prerequisite_title, v_title using errcode = '22023';
        end if;
        insert into public.lesson_prerequisites (lesson_id, prerequisite_lesson_id)
        values (v_lesson_id, v_prerequisite_id)
        on conflict (lesson_id, prerequisite_lesson_id) do nothing;
      end loop;
    end if;
  end loop;

  v_result := jsonb_build_object('lessonsInserted', v_lesson_count, 'subjectId', v_subject_id);

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
