-- Enforce the pending-deletion barrier at the database boundary.
-- This covers direct Supabase table writes as well as writes routed through /api/sync.
-- Service-role maintenance/deletion RPCs remain able to perform privileged cleanup.

create or replace function public.block_pending_account_owned_writes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_old_owner text;
  v_new_owner text;
begin
  -- Worker/service-role requests must be able to finish deletion. Anonymous
  -- requests have no authenticated owner and remain governed by existing RLS.
  if v_user_id is null or coalesce(auth.role(), '') = 'service_role' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op <> 'INSERT' then
    v_old_owner := to_jsonb(old) ->> 'user_id';
  end if;
  if tg_op <> 'DELETE' then
    v_new_owner := to_jsonb(new) ->> 'user_id';
  end if;

  if (v_old_owner = v_user_id::text or v_new_owner = v_user_id::text)
     and public.account_deletion_is_pending() then
    raise exception using
      errcode = '42501',
      message = 'Account changes are disabled while account deletion is pending';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.block_pending_account_owned_writes() from public, anon, authenticated, service_role;

do $$
declare
  v_table record;
begin
  for v_table in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and a.attname = 'user_id'
       and a.attnum > 0
       and not a.attisdropped
  loop
    execute format(
      'drop trigger if exists account_deletion_write_barrier on public.%I',
      v_table.relname
    );
    execute format(
      'create trigger account_deletion_write_barrier
         before insert or update or delete on public.%I
         for each row execute function public.block_pending_account_owned_writes()',
      v_table.relname
    );
  end loop;
end;
$$;

comment on function public.block_pending_account_owned_writes() is
  'Blocks authenticated owners from mutating rows with their user_id while their account deletion is pending; service-role deletion work is exempt.';
