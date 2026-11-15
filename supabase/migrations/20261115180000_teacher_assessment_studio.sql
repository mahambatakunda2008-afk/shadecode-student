-- Structured assessment authoring for the Teacher Client.
-- This migration stores teacher-authored questions and mark schemes separately from learner-facing instructions.

alter table public.platform_assignments
  add column if not exists assessment_type text not null default 'assignment'
    check (assessment_type in ('assignment','quiz','test','examination','practical')),
  add column if not exists questions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 100);

-- Answer keys and marking criteria must never be readable by learners, including
-- direct Supabase table queries. Keep them in a separate teacher-authorized table.
create table if not exists public.platform_assignment_answer_keys (
  assignment_id uuid primary key references public.platform_assignments(id) on delete cascade,
  correct_answers jsonb not null default '[]'::jsonb check (jsonb_typeof(correct_answers) = 'array'),
  mark_scheme jsonb not null default '[]'::jsonb check (jsonb_typeof(mark_scheme) = 'array'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.platform_assignment_answer_keys enable row level security;
drop policy if exists "assigned teachers read assessment answer keys" on public.platform_assignment_answer_keys;
create policy "assigned teachers read assessment answer keys"
  on public.platform_assignment_answer_keys for select to authenticated
  using (
    exists (
      select 1 from public.platform_assignments a
      join public.platform_group_members gm on gm.group_id = a.group_id
      where a.id = platform_assignment_answer_keys.assignment_id
        and gm.user_id = (select auth.uid()) and gm.status = 'active'
        and gm.membership_role in ('teacher','tutor','administrator','staff')
        and (
          not exists (select 1 from public.platform_groups g where g.id = a.group_id and g.institution_id is not null)
          or exists (
            select 1 from public.platform_groups g
            join public.platform_institution_members im on im.institution_id = g.institution_id
            where g.id = a.group_id and im.user_id = (select auth.uid())
              and im.status = 'active' and im.membership_role in ('teacher','tutor','administrator','staff')
          )
        )
    )
  );

revoke insert, update, delete on public.platform_assignment_answer_keys from public, anon, authenticated;
grant select on public.platform_assignment_answer_keys to authenticated;
grant all on public.platform_assignment_answer_keys to service_role;

create or replace function public.create_platform_assessment(
  p_group_id uuid,
  p_title text,
  p_subject text,
  p_instructions text,
  p_due_at timestamptz,
  p_max_score numeric,
  p_publish boolean,
  p_assessment_type text,
  p_questions jsonb,
  p_mark_scheme jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_question jsonb;
  v_total numeric := 0;
  v_question_number integer := 0;
  v_public_questions jsonb := '[]'::jsonb;
  v_answer_keys jsonb := '[]'::jsonb;
begin
  if p_assessment_type not in ('assignment','quiz','test','examination','practical') then
    raise exception 'Invalid assessment type' using errcode = '22023';
  end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) not between 1 and 100 then
    raise exception 'Add between 1 and 100 questions' using errcode = '22023';
  end if;
  if jsonb_typeof(p_mark_scheme) <> 'array' or jsonb_array_length(p_mark_scheme) > 200 then
    raise exception 'Invalid mark scheme' using errcode = '22023';
  end if;

  for v_question in select value from jsonb_array_elements(p_questions)
  loop
    v_question_number := v_question_number + 1;
    if jsonb_typeof(v_question) <> 'object'
      or nullif(btrim(v_question->>'prompt'), '') is null
      or char_length(v_question->>'prompt') > 8000
      or coalesce(v_question->>'type','') not in ('written','multiple_choice','calculation','practical')
      or coalesce((v_question->>'marks')::numeric, 0) <= 0
      or coalesce((v_question->>'marks')::numeric, 0) > 10000 then
      raise exception 'Question % has invalid content or marks', v_question_number using errcode = '22023';
    end if;
    if v_question->>'type' = 'multiple_choice'
      and (jsonb_typeof(v_question->'options') <> 'array' or jsonb_array_length(v_question->'options') < 2
        or nullif(v_question->>'correctOption','') is null
        or not ((v_question->'options') ? (v_question->>'correctOption'))) then
      raise exception 'Multiple-choice question % needs options and a correct option', v_question_number using errcode = '22023';
    end if;
    v_total := v_total + (v_question->>'marks')::numeric;
    v_public_questions := v_public_questions || jsonb_build_array(v_question - 'correctOption');
    if v_question->>'type' = 'multiple_choice' then
      v_answer_keys := v_answer_keys || jsonb_build_array(jsonb_build_object(
        'questionNumber', v_question_number,
        'correctOption', v_question->>'correctOption'
      ));
    end if;
  end loop;

  if abs(v_total - p_max_score) > 0.001 then
    raise exception 'Question marks must add up to the assessment total' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_mark_scheme) item
    where jsonb_typeof(item) <> 'object'
      or nullif(btrim(item->>'criterion'), '') is null
      or char_length(item->>'criterion') > 1000
  ) then
    raise exception 'Each mark-scheme criterion needs a description' using errcode = '22023';
  end if;

  v_id := public.create_platform_assignment(
    p_group_id, p_title, p_subject, coalesce(p_instructions,''), p_due_at, p_max_score, p_publish
  );
  update public.platform_assignments
  set assessment_type = p_assessment_type,
      questions = v_public_questions,
      updated_at = now()
  where id = v_id;

  insert into public.platform_assignment_answer_keys(assignment_id, correct_answers, mark_scheme, created_by)
  values (v_id, v_answer_keys, coalesce(p_mark_scheme, '[]'::jsonb), auth.uid());
  return v_id;
end;
$$;

revoke all on function public.create_platform_assessment(uuid,text,text,text,timestamptz,numeric,boolean,text,jsonb,jsonb) from public, anon;
grant execute on function public.create_platform_assessment(uuid,text,text,text,timestamptz,numeric,boolean,text,jsonb,jsonb) to authenticated;
