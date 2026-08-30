-- Atomic XP increment used by Focus and other server-side completion paths.
-- The UPDATE itself performs the arithmetic in PostgreSQL, avoiding the
-- read-modify-write race that can lose XP when two completions finish together.
create or replace function public.increment_profile_xp(p_user_id uuid, p_amount integer)
returns table (xp integer, level integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    return query
      select coalesce(p.xp, 0)::integer, coalesce(p.level, 1)::integer
      from public.profiles p
      where p.id = p_user_id;
    return;
  end if;

  return query
    update public.profiles p
    set xp = coalesce(p.xp, 0) + p_amount,
        level = floor((coalesce(p.xp, 0) + p_amount)::numeric / 100)::integer + 1
    where p.id = p_user_id
    returning p.xp::integer, p.level::integer;
end;
$$;

revoke all on function public.increment_profile_xp(uuid, integer) from public;
grant execute on function public.increment_profile_xp(uuid, integer) to authenticated;
