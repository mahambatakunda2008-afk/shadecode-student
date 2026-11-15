-- Structured assessment authoring for the Teacher Client.
-- This migration stores teacher-authored questions and mark schemes separately from learner-facing instructions.

alter table public.platform_assignments
  add column if not exists assessment_type text not null default 'assignment'
    check (assessment_type in ('assignment','quiz','test','examination','practical')),
  add column if not exists questions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) <= 100),
  add column if not exists mark_scheme jsonb not null default '[]'::jsonb
    check (jsonb_typeof(mark_scheme) = 'array' and jsonb_array_length(mark_scheme) <= 200);

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
      questions = p_questions,
      mark_scheme = coalesce(p_mark_scheme, '[]'::jsonb),
      updated_at = now()
  where id = v_id;
  return v_id;
end;
$$;

revoke all on function public.create_platform_assessment(uuid,text,text,text,timestamptz,numeric,boolean,text,jsonb,jsonb) from public, anon;
grant execute on function public.create_platform_assessment(uuid,text,text,text,timestamptz,numeric,boolean,text,jsonb,jsonb) to authenticated;
