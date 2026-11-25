-- Run against the isolated fixture after sync migrations are applied.
-- A progress-only offline sync must never replace lesson content or delete its parent.
begin;
do $$
declare
  v_user uuid := gen_random_uuid();
  v_subject uuid := gen_random_uuid();
  v_lesson uuid := gen_random_uuid();
  v_result jsonb;
  v_delete_rejected boolean := false;
begin
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
  values(v_user,'authenticated','authenticated','progress-contract-'||v_user::text||'@example.invalid','',now(),now(),now());
  insert into public.subjects(id,user_id,name)
  values(v_subject,v_user,'Progress contract subject');
  insert into public.learn_lessons(id,user_id,subject_id,topic,title,description,difficulty,progress,blocks)
  values(
    v_lesson,v_user,v_subject,'Sequences','Sequences: complete lesson',
    'Original lesson description','hard',12,
    '[{"type":"explanation","content":"Original lesson content"}]'::jsonb
  );

  perform set_config('request.jwt.claim.sub',v_user::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_user::text,'role','authenticated')::text,true);
  execute 'set local role authenticated';

  select public.apply_sync_mutation(
    'learn_lessons','update',v_lesson::text,
    jsonb_build_object('id',v_lesson::text,'user_id',v_user::text,'sync_kind','progress','progress',47),
    0,1,'offline-progress-contract-test'
  ) into v_result;
  if v_result->>'status' <> 'accepted' then
    raise exception 'Progress sync was not accepted: %',v_result;
  end if;

  if not exists (
    select 1 from public.learn_lessons
    where id=v_lesson and user_id=v_user and progress=47
      and subject_id=v_subject and topic='Sequences'
      and title='Sequences: complete lesson'
      and description='Original lesson description'
      and difficulty='hard'
      and blocks='[{"type":"explanation","content":"Original lesson content"}]'::jsonb
  ) then
    raise exception 'Progress sync modified lesson content or failed to update progress';
  end if;

  begin
    perform public.apply_sync_mutation(
      'learn_lessons','delete',v_lesson::text,
      jsonb_build_object('id',v_lesson::text,'user_id',v_user::text,'sync_kind','progress'),
      1,2,'offline-progress-contract-test'
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
