create table if not exists public.learner_curriculum_objective_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculum_version_id uuid not null references public.curriculum_versions(id) on delete cascade,
  objective_key text not null,
  status text not null default 'not_started' check (status in ('not_started','learning','practicing','mastered')),
  mastery_score numeric(5,2) not null default 0 check (mastery_score >= 0 and mastery_score <= 100),
  attempts integer not null default 0 check (attempts >= 0),
  completed_lessons integer not null default 0 check (completed_lessons >= 0),
  last_seen_at timestamptz,
  mastered_at timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, curriculum_version_id, objective_key)
);

create index if not exists learner_curriculum_objective_progress_next_idx
  on public.learner_curriculum_objective_progress (user_id, curriculum_version_id, status, mastery_score, objective_key);

alter table public.learner_curriculum_objective_progress enable row level security;

drop policy if exists "Users can read own curriculum objective progress" on public.learner_curriculum_objective_progress;
create policy "Users can read own curriculum objective progress"
  on public.learner_curriculum_objective_progress for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own curriculum objective progress" on public.learner_curriculum_objective_progress;
create policy "Users can insert own curriculum objective progress"
  on public.learner_curriculum_objective_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own curriculum objective progress" on public.learner_curriculum_objective_progress;
create policy "Users can update own curriculum objective progress"
  on public.learner_curriculum_objective_progress for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.get_next_curriculum_objective(p_curriculum_version_id uuid)
returns table (
  objective_key text,
  topic text,
  title text,
  description text,
  education_level text,
  paper_component text,
  status text,
  mastery_score numeric,
  attempts integer,
  completed_lessons integer
)
language sql
stable
as $$
  with verified as (
    select co.objective_key, co.topic, co.title, co.description, co.education_level, co.paper_component
    from public.curriculum_objectives co
    join public.curriculum_versions cv on cv.id = co.curriculum_version_id
    where co.curriculum_version_id = p_curriculum_version_id
      and cv.status = 'verified'
      and co.status = 'verified'
  )
  select
    v.objective_key,
    v.topic,
    v.title,
    v.description,
    v.education_level,
    v.paper_component,
    coalesce(p.status, 'not_started') as status,
    coalesce(p.mastery_score, 0) as mastery_score,
    coalesce(p.attempts, 0) as attempts,
    coalesce(p.completed_lessons, 0) as completed_lessons
  from verified v
  left join public.learner_curriculum_objective_progress p
    on p.curriculum_version_id = p_curriculum_version_id
   and p.objective_key = v.objective_key
   and p.user_id = (select auth.uid())
  order by
    case when coalesce(p.status, 'not_started') = 'mastered' then 1 else 0 end,
    coalesce(p.mastery_score, 0) asc,
    case when coalesce(p.status, 'not_started') = 'not_started' then 0 else 1 end,
    v.objective_key asc
  limit 1;
$$;

grant execute on function public.get_next_curriculum_objective(uuid) to authenticated;

create or replace function public.touch_curriculum_objective_learning(
  p_curriculum_version_id uuid,
  p_objective_keys text[]
)
returns integer
language plpgsql
security invoker
as $$
declare
  k text;
  touched integer := 0;
begin
  if (select auth.uid()) is null or p_curriculum_version_id is null or p_objective_keys is null then
    return 0;
  end if;
  foreach k in array p_objective_keys loop
    if exists (
      select 1 from public.curriculum_objectives co
      join public.curriculum_versions cv on cv.id = co.curriculum_version_id
      where co.curriculum_version_id = p_curriculum_version_id
        and co.objective_key = k
        and co.status = 'verified'
        and cv.status = 'verified'
    ) then
      insert into public.learner_curriculum_objective_progress
        (user_id, curriculum_version_id, objective_key, status, last_seen_at)
      values
        ((select auth.uid()), p_curriculum_version_id, k, 'learning', now())
      on conflict (user_id, curriculum_version_id, objective_key)
      do update set
        status = case when learner_curriculum_objective_progress.status = 'mastered' then 'mastered' else 'learning' end,
        last_seen_at = now(),
        updated_at = now();
      touched := touched + 1;
    end if;
  end loop;
  return touched;
end;
$$;

grant execute on function public.touch_curriculum_objective_learning(uuid, text[]) to authenticated;

create or replace function public.record_curriculum_lesson_completion(
  p_curriculum_version_id uuid,
  p_objective_keys text[]
)
returns integer
language plpgsql
security invoker
as $$
declare
  k text;
  touched integer := 0;
begin
  if (select auth.uid()) is null or p_curriculum_version_id is null or p_objective_keys is null then
    return 0;
  end if;
  foreach k in array p_objective_keys loop
    if exists (
      select 1 from public.curriculum_objectives co
      join public.curriculum_versions cv on cv.id = co.curriculum_version_id
      where co.curriculum_version_id = p_curriculum_version_id
        and co.objective_key = k
        and co.status = 'verified'
        and cv.status = 'verified'
    ) then
      insert into public.learner_curriculum_objective_progress
        (user_id, curriculum_version_id, objective_key, status, completed_lessons, last_seen_at)
      values
        ((select auth.uid()), p_curriculum_version_id, k, 'practicing', 1, now())
      on conflict (user_id, curriculum_version_id, objective_key)
      do update set
        status = case when learner_curriculum_objective_progress.status = 'mastered' then 'mastered' else 'practicing' end,
        completed_lessons = learner_curriculum_objective_progress.completed_lessons + 1,
        last_seen_at = now(),
        updated_at = now();
      touched := touched + 1;
    end if;
  end loop;
  return touched;
end;
$$;

grant execute on function public.record_curriculum_lesson_completion(uuid, text[]) to authenticated;
