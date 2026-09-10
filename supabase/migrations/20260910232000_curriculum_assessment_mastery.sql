-- Curriculum assessment evidence and mastery progression.
-- Assessment results are accepted only for verified curriculum objectives.

create table if not exists public.learner_curriculum_assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid references public.learn_lessons(id) on delete set null,
  curriculum_version_id uuid not null references public.curriculum_versions(id) on delete cascade,
  objective_keys text[] not null default '{}',
  score numeric(5,2) not null check (score >= 0 and score <= 100),
  question_count integer not null check (question_count > 0),
  correct_count integer not null check (correct_count >= 0 and correct_count <= question_count),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists learner_curriculum_assessment_attempts_user_idx
  on public.learner_curriculum_assessment_attempts(user_id, created_at desc);

create index if not exists learner_curriculum_assessment_attempts_lesson_idx
  on public.learner_curriculum_assessment_attempts(lesson_id, created_at desc);

alter table public.learner_curriculum_assessment_attempts enable row level security;

drop policy if exists learner_curriculum_assessment_attempts_select_own on public.learner_curriculum_assessment_attempts;
create policy learner_curriculum_assessment_attempts_select_own
  on public.learner_curriculum_assessment_attempts for select
  using (auth.uid() = user_id);

drop policy if exists learner_curriculum_assessment_attempts_insert_own on public.learner_curriculum_assessment_attempts;
create policy learner_curriculum_assessment_attempts_insert_own
  on public.learner_curriculum_assessment_attempts for insert
  with check (auth.uid() = user_id);

create or replace function public.record_curriculum_assessment_result(
  p_user_id uuid,
  p_curriculum_version_id uuid,
  p_objective_keys text[],
  p_score numeric,
  p_correct_count integer,
  p_question_count integer,
  p_lesson_id uuid default null,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verified boolean;
  v_key text;
  v_status text;
  v_mastery numeric;
  v_result jsonb;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized';
  end if;

  if p_question_count is null or p_question_count <= 0 then
    raise exception 'Invalid question count';
  end if;
  if p_correct_count is null or p_correct_count < 0 or p_correct_count > p_question_count then
    raise exception 'Invalid correct count';
  end if;
  if p_score is null or p_score < 0 or p_score > 100 then
    raise exception 'Invalid score';
  end if;

  select exists(
    select 1 from curriculum_versions
    where id = p_curriculum_version_id and status = 'verified'
  ) into v_verified;

  if not v_verified then
    raise exception 'Curriculum version is not verified';
  end if;

  if coalesce(array_length(p_objective_keys, 1), 0) = 0 then
    raise exception 'No curriculum objectives supplied';
  end if;

  insert into learner_curriculum_assessment_attempts(
    user_id, lesson_id, curriculum_version_id, objective_keys,
    score, question_count, correct_count, evidence
  ) values (
    p_user_id, p_lesson_id, p_curriculum_version_id, p_objective_keys,
    p_score, p_question_count, p_correct_count, coalesce(p_evidence, '{}'::jsonb)
  );

  -- Only objective keys belonging to this verified curriculum version can receive evidence.
  for v_key in
    select distinct o.objective_key
    from curriculum_objectives o
    where o.curriculum_version_id = p_curriculum_version_id
      and o.status = 'verified'
      and o.objective_key = any(p_objective_keys)
  loop
    -- A lesson assessment updates evidence without erasing stronger prior mastery.
    -- Score bands deliberately avoid treating lesson completion as mastery:
    -- 80+ mastered, 60-79 practicing, below 60 learning.
    v_status := case
      when p_score >= 80 then 'mastered'
      when p_score >= 60 then 'practicing'
      else 'learning'
    end;

    insert into learner_curriculum_objective_progress(
      user_id, curriculum_version_id, objective_key, status,
      mastery_score, attempts, last_seen_at, mastered_at, evidence
    ) values (
      p_user_id, p_curriculum_version_id, v_key, v_status,
      p_score, 1, now(), case when p_score >= 80 then now() else null end,
      jsonb_build_object('lastAssessmentScore', p_score, 'source', 'lesson_quiz')
    )
    on conflict (user_id, curriculum_version_id, objective_key)
    do update set
      status = case
        when learner_curriculum_objective_progress.status = 'mastered' then 'mastered'
        when excluded.mastery_score >= 80 then 'mastered'
        when excluded.mastery_score >= 60 then 'practicing'
        else 'learning'
      end,
      mastery_score = case
        when learner_curriculum_objective_progress.status = 'mastered'
          then greatest(learner_curriculum_objective_progress.mastery_score, excluded.mastery_score)
        else greatest(learner_curriculum_objective_progress.mastery_score, excluded.mastery_score)
      end,
      attempts = learner_curriculum_objective_progress.attempts + 1,
      last_seen_at = now(),
      mastered_at = case
        when learner_curriculum_objective_progress.status = 'mastered' then learner_curriculum_objective_progress.mastered_at
        when excluded.mastery_score >= 80 then coalesce(learner_curriculum_objective_progress.mastered_at, now())
        else learner_curriculum_objective_progress.mastered_at
      end,
      evidence = coalesce(learner_curriculum_objective_progress.evidence, '{}'::jsonb)
        || jsonb_build_object(
          'lastAssessmentScore', excluded.mastery_score,
          'lastAssessmentAt', now(),
          'source', 'lesson_quiz'
        );
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
    'objectiveKey', objective_key,
    'status', status,
    'masteryScore', mastery_score,
    'attempts', attempts,
    'masteredAt', mastered_at
  ) order by objective_key), '[]'::jsonb)
  into v_result
  from learner_curriculum_objective_progress
  where user_id = p_user_id
    and curriculum_version_id = p_curriculum_version_id
    and objective_key = any(p_objective_keys);

  return jsonb_build_object(
    'score', p_score,
    'correctCount', p_correct_count,
    'questionCount', p_question_count,
    'objectives', v_result
  );
end;
$$;

revoke all on function public.record_curriculum_assessment_result(uuid, uuid, text[], numeric, integer, integer, uuid, jsonb) from public;
grant execute on function public.record_curriculum_assessment_result(uuid, uuid, text[], numeric, integer, integer, uuid, jsonb) to authenticated;
