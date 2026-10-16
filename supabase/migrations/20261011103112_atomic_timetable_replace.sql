-- Replace a user's timetable in one transaction.
-- SECURITY INVOKER keeps row-level security in force; the user identity
-- comes from the verified Supabase JWT, never from client-supplied user_id.
create or replace function public.replace_own_timetable(p_slots jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_slot jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if jsonb_typeof(p_slots) is distinct from 'array' then
    raise exception 'Timetable must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_slots) < 1 or jsonb_array_length(p_slots) > 100 then
    raise exception 'Timetable must contain between 1 and 100 slots' using errcode = '22023';
  end if;

  for v_slot in select value from jsonb_array_elements(p_slots)
  loop
    if jsonb_typeof(v_slot) is distinct from 'object'
       or nullif(btrim(v_slot ->> 'subject'), '') is null
       or coalesce(v_slot ->> 'start_time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(v_slot ->> 'end_time', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
       or coalesce(v_slot ->> 'is_break', 'false') not in ('true', 'false') then
      raise exception 'Invalid timetable slot' using errcode = '22023';
    end if;
  end loop;

  delete from public.timetable
  where user_id = v_user_id;

  insert into public.timetable (user_id, subject, start_time, end_time, is_break)
  select
    v_user_id,
    btrim(slot ->> 'subject'),
    slot ->> 'start_time',
    slot ->> 'end_time',
    coalesce((slot ->> 'is_break')::boolean, false)
  from jsonb_array_elements(p_slots) as entries(slot);
end;
$$;

revoke all on function public.replace_own_timetable(jsonb) from public, anon;
grant execute on function public.replace_own_timetable(jsonb) to authenticated;
