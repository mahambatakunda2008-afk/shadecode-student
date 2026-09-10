create or replace function public.sync_lesson_curriculum_objective_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
begin
  if new.curriculum_version_id is null or new.curriculum_objective_keys is null or cardinality(new.curriculum_objective_keys) = 0 then
    return new;
  end if;

  foreach k in array new.curriculum_objective_keys loop
    if exists (
      select 1 from public.curriculum_objectives co
      join public.curriculum_versions cv on cv.id = co.curriculum_version_id
      where co.curriculum_version_id = new.curriculum_version_id
        and co.objective_key = k
        and co.status = 'verified'
        and cv.status = 'verified'
    ) then
      insert into public.learner_curriculum_objective_progress
        (user_id, curriculum_version_id, objective_key, status, last_seen_at, completed_lessons)
      values
        (new.user_id, new.curriculum_version_id, k, 'learning', now(), 0)
      on conflict (user_id, curriculum_version_id, objective_key)
      do update set
        status = case when learner_curriculum_objective_progress.status = 'mastered' then 'mastered' else 'learning' end,
        last_seen_at = now(),
        updated_at = now();
    end if;
  end loop;

  return new;
end;
$$;

create or replace function public.sync_completed_lesson_curriculum_objectives()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k text;
begin
  if coalesce(old.progress, 0) >= 100 or coalesce(new.progress, 0) < 100 then
    return new;
  end if;

  if new.curriculum_version_id is null or new.curriculum_objective_keys is null or cardinality(new.curriculum_objective_keys) = 0 then
    return new;
  end if;

  foreach k in array new.curriculum_objective_keys loop
    if exists (
      select 1 from public.curriculum_objectives co
      join public.curriculum_versions cv on cv.id = co.curriculum_version_id
      where co.curriculum_version_id = new.curriculum_version_id
        and co.objective_key = k
        and co.status = 'verified'
        and cv.status = 'verified'
    ) then
      insert into public.learner_curriculum_objective_progress
        (user_id, curriculum_version_id, objective_key, status, completed_lessons, last_seen_at)
      values
        (new.user_id, new.curriculum_version_id, k, 'practicing', 1, now())
      on conflict (user_id, curriculum_version_id, objective_key)
      do update set
        status = case when learner_curriculum_objective_progress.status = 'mastered' then 'mastered' else 'practicing' end,
        completed_lessons = learner_curriculum_objective_progress.completed_lessons + 1,
        last_seen_at = now(),
        updated_at = now();
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists trg_sync_lesson_curriculum_objectives on public.learn_lessons;
create trigger trg_sync_lesson_curriculum_objectives
after insert on public.learn_lessons
for each row execute function public.sync_lesson_curriculum_objective_progress();

drop trigger if exists trg_sync_completed_lesson_curriculum_objectives on public.learn_lessons;
create trigger trg_sync_completed_lesson_curriculum_objectives
after update of progress on public.learn_lessons
for each row execute function public.sync_completed_lesson_curriculum_objectives();
