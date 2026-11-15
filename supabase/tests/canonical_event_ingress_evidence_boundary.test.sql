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

  -- Direct table INSERT must be subject to the same boundary as the RPC.
  insert into public.cortex_events(user_id,type,source,data)
  values(
    v_user,'question_attempted','forged-direct-insert',
    jsonb_build_object(
      'eventId',v_event_id||'-direct',
      'metadata',jsonb_build_object('correct',true,'percentage',100,'note','safe')
    )
  )
  returning * into v_row;
  if v_row.data->'metadata' ? 'correct' or v_row.data->'metadata' ? 'percentage' then
    raise exception 'Direct authenticated table INSERT retained forged marking metadata';
  end if;
  if v_row.data->'metadata'->>'note' <> 'safe' then
    raise exception 'Direct authenticated table INSERT lost safe metadata';
  end if;

  -- Direct table UPDATE must not be able to re-introduce forged marks.
  update public.cortex_events
  set data = jsonb_set(
    data,'{metadata}',
    jsonb_build_object('correct',true,'score',99,'note','updated-safe'),
    true
  )
  where id = v_row.id
  returning * into v_row;
  if v_row.data->'metadata' ? 'correct' or v_row.data->'metadata' ? 'score' then
    raise exception 'Direct authenticated table UPDATE reintroduced forged marking metadata';
  end if;
  if v_row.data->'metadata'->>'note' <> 'updated-safe' then
    raise exception 'Direct authenticated table UPDATE lost safe metadata';
  end if;
end $;

rollback;
