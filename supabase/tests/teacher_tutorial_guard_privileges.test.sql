-- Run after the teacher tutorial migrations on a disposable Supabase database.
-- Confirms the guard remains attached to its trigger but is not directly callable by API roles.
begin;
do $$
declare
  v_function oid := 'public.guard_teacher_tutorial_transition()'::regprocedure;
begin
  if has_function_privilege('anon', v_function, 'EXECUTE') then
    raise exception 'anon can directly execute the trigger-only tutorial guard';
  end if;
  if has_function_privilege('authenticated', v_function, 'EXECUTE') then
    raise exception 'authenticated can directly execute the trigger-only tutorial guard';
  end if;
  if has_function_privilege('service_role', v_function, 'EXECUTE') then
    raise exception 'service_role can directly execute the trigger-only tutorial guard';
  end if;
  if not exists (
    select 1
    from pg_trigger t
    where t.tgfoid = v_function
      and t.tgname = 'teacher_tutorial_transition_guard'
      and not t.tgisinternal
  ) then
    raise exception 'Teacher tutorial transition guard trigger is missing';
  end if;
end $$;
rollback;
