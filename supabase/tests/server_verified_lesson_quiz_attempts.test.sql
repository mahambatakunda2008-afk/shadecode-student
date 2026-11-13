-- Run against a disposable transaction in a Supabase test project.
begin;
do $$
declare v_user uuid; v_lesson uuid; v_id uuid; v_count integer;
begin
  select id into v_user from auth.users order by created_at limit 1;
  select id into v_lesson from public.learn_lessons where user_id=v_user limit 1;
  if v_user is null or v_lesson is null then raise exception 'Missing quiz test fixture'; end if;
  execute 'set local role service_role';
  insert into public.lesson_quiz_attempts(user_id,lesson_id,questions)
  values(v_user,v_lesson,'[{"id":1,"question":"fixture","options":["a","b","c","d"],"correctIndex":2,"explanation":"fixture"}]'::jsonb)
  returning id into v_id;
  select count(*) into v_count from public.lesson_quiz_attempts
  where id=v_id and questions->0->>'correctIndex'='2';
  if v_count<>1 then raise exception 'Server answer key was not persisted'; end if;
  execute 'reset role';
  execute 'set local role authenticated';
  if has_table_privilege(current_user,'public.lesson_quiz_attempts','select') then
    raise exception 'Authenticated role can read private answer keys';
  end if;
  execute 'reset role';
end $$;
rollback;