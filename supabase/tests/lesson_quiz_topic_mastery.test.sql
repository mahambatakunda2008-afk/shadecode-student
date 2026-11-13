begin;
do $$
declare
  v_definition text;
  v_projector_signature regprocedure;
begin
  select pg_get_functiondef('public.complete_lesson_quiz_attempt(uuid)'::regprocedure)
    into v_definition;
  if position('project_canonical_learning_observation' in v_definition) = 0 then
    raise exception 'Lesson quiz completion does not project canonical topic evidence';
  end if;
  if position('curriculumTopicKey' in v_definition) = 0 or position('topicMapped' in v_definition) = 0 then
    raise exception 'Lesson quiz completion does not retain verified topic identity';
  end if;
  select p.oid::regprocedure into v_projector_signature
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='project_canonical_learning_observation';
  if v_projector_signature is null then
    raise exception 'Canonical projector RPC is missing';
  end if;
  if has_function_privilege('authenticated', v_projector_signature, 'EXECUTE') then
    raise exception 'Canonical projector must remain unavailable to authenticated clients';
  end if;
end $$;
rollback;