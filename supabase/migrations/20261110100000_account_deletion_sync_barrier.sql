-- Prevent queued browser sync writes once a user has requested account deletion.
-- This exposes only the caller's own boolean state; the queue table remains private.

create or replace function public.account_deletion_is_pending()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.account_deletion_requests r
     where r.user_id = auth.uid()
       and r.status in ('pending', 'processing', 'failed')
  );
$$;

revoke all on function public.account_deletion_is_pending() from public, anon;
grant execute on function public.account_deletion_is_pending() to authenticated, service_role;

comment on function public.account_deletion_is_pending() is
  'Returns only whether the authenticated caller has an active account-deletion request. Used as a sync safety barrier.';
