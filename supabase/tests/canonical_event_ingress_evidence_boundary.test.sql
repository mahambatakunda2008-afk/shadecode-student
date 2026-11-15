-- Run against a disposable Supabase test project. All writes roll back.
begin;
set local role service_role;

do $$
declare
  v_user uuid;
  v_event_id text := 'client-ingress-boundary-' || gen_random_uuid()::text;
  v_row public.cortex_events%rowtype;
begin
  select id into v_user from auth.users order by created_at limit 1;
  if v_user is null then raise exception 'Missing auth user fixture'; end if;

  perform set_config('request.jwt.claim.sub',v_user::text,true);
  execute 'set local role authenticated';

  select * into v_row
  from public.insert_canonical_cortex_event(
    v_user,
    jsonb_build_object(
      'eventId',v_event_id,
      'sourceEventId',v_event_id,
      'userId',v_user,
      'kind','question_attempted',
      'source','forged-client-test',
      'subjectId','Physics',
      'topicId','Equations of motion',
      'metadata',jsonb_build_object(
        'correct',true,
        'score',10,
        'maxScore',10,
        'percentage',100,
        'evidenceScore',100,
        'verified',true,
        'teacherReviewed',true,
        'topicLabel','Equations of motion',
        'attemptId','forged-attempt'
      )
    )
  );

  if v_row.id is null then raise exception 'Canonical telemetry event was not persisted'; end if;
  if v_row.data->'metadata' ? 'correct'
     or v_row.data->'metadata' ? 'score'
     or v_row.data->'metadata' ? 'percentage'
     or v_row.data->'metadata' ? 'evidenceScore'
     or v_row.data->'metadata' ? 'verified'
     or v_row.data->'metadata' ? 'teacherReviewed' then
    raise exception 'Authenticated client event retained mastery-driving metadata';
  end if;
  if v_row.data->'metadata'->>'topicLabel' <> 'Equations of motion' then
    raise exception 'Safe activity metadata was not preserved';
  end if;
end $$;

rollback;
