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
begin
  -- Worker/service-role requests must be able to finish deletion. Anonymous
  -- requests have no authenticated owner and remain governed by existing RLS.
  if v_user_id is null or coalesce(auth.role(), '') = 'service_role' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  -- A pending account must not mutate any account-aware table, even through
  -- rows whose ownership is represented by contributor_id/challenger_id or
  -- attribution columns rather than user_id.
  if public.account_deletion_is_pending() then
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
       and a.attnum > 0
       and not a.attisdropped
       and (
         a.attname ~* '(user|owner|student|learner|account|contributor|challenger|reviewer|moderator)'
         or a.attname in ('created_by', 'assigned_by', 'approved_by', 'reviewed_by')
         or exists (
           select 1
             from pg_constraint fk
            where fk.conrelid = c.oid
              and fk.contype = 'f'
              and fk.confrelid = 'auth.users'::regclass
              and a.attnum = any(fk.conkey)
         )
       )
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

-- Storage object writes are also account mutations. Keep shared buckets and
-- existing RLS policy semantics, but reject direct authenticated object changes
-- from a pending account. Supabase Storage service-role operations remain exempt.
drop trigger if exists account_deletion_write_barrier on storage.objects;
create trigger account_deletion_write_barrier
  before insert or update or delete on storage.objects
  for each row execute function public.block_pending_account_owned_writes();

comment on function public.block_pending_account_owned_writes() is
  'Blocks authenticated users from mutating account-aware public tables or Storage objects while their own account deletion is pending; service-role deletion work is exempt.';
