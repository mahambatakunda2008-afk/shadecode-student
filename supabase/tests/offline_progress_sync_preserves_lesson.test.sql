-- Run against a disposable transaction in a Supabase test project.
-- A progress-only offline sync must never replace lesson content or delete its parent.
begin;
do $$
declare
  v_user uuid;
  v_lesson uuid;
  v_subject uuid;
  v_title text;
  v_description text;
  v_difficulty text;
  v_blocks jsonb;
  v_result jsonb;
  v_delete_rejected boolean := false;
begin
  select l.user_id,l.id,l.subject_id,l.title,l.description,l.difficulty,l.blocks
  into v_user,v_lesson,v_subject,v_title,v_description,v_difficulty,v_blocks
  from public.learn_lessons l
  where l.user_id is not null
  order by l.created_at desc nulls last
  limit 1;

  if v_user is null or v_lesson is null then
    raise exception 'Missing learn_lessons fixture for progress sync contract';
  end if;

  perform set_config('request.jwt.claim.sub',v_user::text,true);
  execute 'set local role authenticated';

  select public.apply_sync_mutation(
    'learn_lessons',
    'update',
    v_lesson::text,
    jsonb_build_object('id',v_lesson::text,'user_id',v_user::text,'sync_kind','progress','progress',47),
    0,
    1,
    'offline-progress-contract-test'
  ) into v_result;

  if v_result->>'status' <> 'accepted' then
    raise exception 'Progress sync was not accepted: %',v_result;
  end if;

  if not exists (
    select 1 from public.learn_lessons
    where id=v_lesson and user_id=v_user
      and progress=47
      and subject_id is not distinct from v_subject
      and title is not distinct from v_title
      and description is not distinct from v_description
      and difficulty is not distinct from v_difficulty
      and blocks is not distinct from v_blocks
  ) then
    raise exception 'Progress sync modified lesson content or failed to update progress';
  end if;

  begin
    perform public.apply_sync_mutation(
      'learn_lessons',
      'delete',
      v_lesson::text,
      jsonb_build_object('id',v_lesson::text,'user_id',v_user::text,'sync_kind','progress'),
      1,
      2,
      'offline-progress-contract-test'
    );
  exception when others then
    v_delete_rejected := true;
  end;

  if not v_delete_rejected then
    raise exception 'Progress-only delete unexpectedly accepted';
  end if;

  if not exists(select 1 from public.learn_lessons where id=v_lesson and user_id=v_user) then
    raise exception 'Progress-only delete removed its parent lesson';
  end if;
end $$;
rollback;
