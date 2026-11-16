-- Run after 20261116101500_restrict_trigger_and_answer_key_grants.sql
-- in a disposable Supabase database built from the tracked migration tree.

do $$
declare
  v_function regprocedure;
  v_name text;
begin
  foreach v_name in array array[
    'public.apply_lesson_vote()',
    'public.guard_teacher_tutorial_transition()',
    'public.publish_lesson_to_library()'
  ] loop
    v_function := v_name::regprocedure;
    if has_function_privilege('anon', v_function, 'EXECUTE')
       or has_function_privilege('authenticated', v_function, 'EXECUTE')
       or has_function_privilege('service_role', v_function, 'EXECUTE') then
      raise exception 'Trigger-only function remains directly executable: %', v_name;
    end if;
  end loop;

  if not exists (
    select 1 from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where not t.tgisinternal and n.nspname = 'public'
      and p.proname = 'apply_lesson_vote'
      and t.tgname = 'lesson_votes_apply'
  ) then raise exception 'lesson vote trigger is missing'; end if;

  if not exists (
    select 1 from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where not t.tgisinternal and n.nspname = 'public'
      and p.proname = 'guard_teacher_tutorial_transition'
      and t.tgname = 'teacher_tutorial_transition_guard'
  ) then raise exception 'teacher tutorial transition trigger is missing'; end if;

  if not exists (
    select 1 from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where not t.tgisinternal and n.nspname = 'public'
      and p.proname = 'publish_lesson_to_library'
      and t.tgname = 'learn_lessons_publish_to_library'
  ) then raise exception 'lesson library publication trigger is missing'; end if;

  if has_function_privilege('anon', 'public.insert_canonical_cortex_event(uuid,jsonb)', 'EXECUTE') then
    raise exception 'anon must not execute canonical Cortex event insertion';
  end if;
  if not has_function_privilege('authenticated', 'public.insert_canonical_cortex_event(uuid,jsonb)', 'EXECUTE') then
    raise exception 'authenticated canonical event insertion grant was unexpectedly removed';
  end if;

  if has_table_privilege('anon', 'public.challenge_answer_keys', 'SELECT')
     or has_table_privilege('anon', 'public.challenge_answer_keys', 'INSERT')
     or has_table_privilege('anon', 'public.challenge_answer_keys', 'UPDATE')
     or has_table_privilege('anon', 'public.challenge_answer_keys', 'DELETE')
     or has_table_privilege('authenticated', 'public.challenge_answer_keys', 'SELECT')
     or has_table_privilege('authenticated', 'public.challenge_answer_keys', 'INSERT')
     or has_table_privilege('authenticated', 'public.challenge_answer_keys', 'UPDATE')
     or has_table_privilege('authenticated', 'public.challenge_answer_keys', 'DELETE') then
    raise exception 'Browser roles retain direct access to private challenge answer keys';
  end if;

  if not has_table_privilege('service_role', 'public.challenge_answer_keys', 'SELECT')
     or not has_table_privilege('service_role', 'public.challenge_answer_keys', 'INSERT')
     or not has_table_privilege('service_role', 'public.challenge_answer_keys', 'UPDATE')
     or not has_table_privilege('service_role', 'public.challenge_answer_keys', 'DELETE') then
    raise exception 'Trusted service-role answer-key access was unexpectedly removed';
  end if;
end
$$;

-- Trigger execution must continue to work for a browser role even though it
-- no longer has direct EXECUTE privileges on the trigger functions.
begin;
set local role authenticated;
insert into public.lesson_votes (lesson_id, helpful)
values (gen_random_uuid(), true);

do $
declare
  v_tutorial_id uuid;
begin
  insert into public.teacher_tutorials default values returning id into v_tutorial_id;
  update public.teacher_tutorials set id = id where id = v_tutorial_id;
end
$;

insert into public.learn_lessons (progress, blocks)
values (0, '[]'::jsonb);
reset role;
rollback;
