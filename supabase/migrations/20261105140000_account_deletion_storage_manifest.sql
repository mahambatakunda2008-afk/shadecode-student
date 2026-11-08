-- Exact, read-only Storage manifest for a single account deletion.
-- Only private user-owned buckets are included. Shared past-papers is excluded.

create or replace function public.account_deletion_storage_manifest(p_user_id uuid)
returns table (
  bucket_id text,
  object_name text,
  source text
)
language sql
security definer
set search_path = ''
as $$
  select distinct manifest.bucket_id, manifest.object_name, manifest.source
  from (
    select
      o.bucket_id::text as bucket_id,
      o.name::text as object_name,
      'user_uid_prefix'::text as source
    from storage.objects o
    where o.bucket_id in ('shadecode-backups', 'community-uploads-pending')
      and o.name like p_user_id::text || '/%'

    union all

    select
      'community-uploads-pending'::text as bucket_id,
      cu.file_path::text as object_name,
      'community_uploads.file_path'::text as source
    from public.community_uploads cu
    where cu.contributor_id = p_user_id
      -- A path shared by another contributor's row is not exclusively owned
      -- by this account. Keep it rather than deleting another user's object.
      and not exists (
        select 1
        from public.community_uploads other_upload
        where other_upload.file_path = cu.file_path
          and other_upload.contributor_id is distinct from p_user_id
      )
  ) manifest
  where p_user_id is not null
    and manifest.object_name is not null
    and length(manifest.object_name) > 0
  order by manifest.bucket_id, manifest.object_name, manifest.source;
$$;

revoke all on function public.account_deletion_storage_manifest(uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_storage_manifest(uuid) to service_role;

comment on function public.account_deletion_storage_manifest(uuid) is
  'Returns exact objects from the account-owned backup and pending community-upload buckets only. Shared past-papers is intentionally excluded. Read-only and service-role-only.';
