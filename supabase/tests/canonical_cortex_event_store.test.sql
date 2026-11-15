-- Run with psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/canonical_cortex_event_store.test.sql
-- Uses one existing auth user and rolls back all writes.
begin;
set local role service_role;

do $$
declare
  v_user uuid;
  v_event_id text := 'canonical-event-store-' || gen_random_uuid()::text;
  v_first uuid;
  v_duplicate uuid;
  v_count integer;
  v_default text;
begin
  select id into v_user from auth.users order by created_at limit 1;
  if v_user is null then
    raise exception 'Missing auth user fixture for canonical Cortex event store test';
  end if;

  select column_default into v_default
  from information_schema.columns
  where table_schema='public'
    and table_name='cortex_events'
    and column_name='id';

  if coalesce(v_default,'') not ilike '%gen_random_uuid%' then
    raise exception 'cortex_events.id must default to gen_random_uuid(); got %',v_default;
  end if;

  insert into public.cortex_events(user_id,type,source,data)
  values(v_user,'question.attempted','migration-test',jsonb_build_object('eventId',v_event_id))
  returning id into v_first;

  if v_first is null then
    raise exception 'Canonical event insert did not generate an id';
  end if;

  insert into public.cortex_events(user_id,type,source,data)
  values(v_user,'question.attempted','migration-test',jsonb_build_object('eventId',v_event_id))
  on conflict ((data->>'eventId')) where (data ? 'eventId') do nothing
  returning id into v_duplicate;

  if v_duplicate is not null then
    raise exception 'Duplicate canonical eventId unexpectedly inserted a second row';
  end if;

  select count(*) into v_count
  from public.cortex_events
  where data->>'eventId'=v_event_id;

  if v_count <> 1 then
    raise exception 'Expected exactly one canonical event row, got %',v_count;
  end if;
end $$;

rollback;
