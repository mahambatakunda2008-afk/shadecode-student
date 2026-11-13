create or replace function public.bump_recommendation_cache_on_cortex_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_kind text := lower(trim(coalesce(new.type,'')));
begin
  if v_kind not in (
    'lesson.completed','lesson_completed',
    'quiz.completed','quiz_completed',
    'exam.completed','exam_completed',
    'study_session.finished','study_session_finished',
    'activity.completed','activity_completed',
    'question.attempted','question_attempted',
    'task.completed','task_completed',
    'mistake.reviewed','mistake_reviewed',
    'project.evidence_added','project_evidence_added',
    'project.stage_completed','project_stage_completed'
  ) then
    return new;
  end if;

  insert into public.recommendation_cache_invalidation_events(user_id,event_id)
  values(new.user_id,new.id)
  on conflict do nothing;

  if found then
    insert into public.recommendation_cache_versions(user_id,version,updated_at)
    values(new.user_id,1,now())
    on conflict(user_id) do update
      set version = public.recommendation_cache_versions.version + 1,
          updated_at = now();
  end if;

  return new;
end;
$$;

revoke all on function public.bump_recommendation_cache_on_cortex_event() from public,anon,authenticated;
drop trigger if exists cortex_event_bump_recommendation_cache on public.cortex_events;
create trigger cortex_event_bump_recommendation_cache
after insert on public.cortex_events
for each row
execute function public.bump_recommendation_cache_on_cortex_event();
