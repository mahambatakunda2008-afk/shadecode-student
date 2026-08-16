-- Harden SECURITY DEFINER helper functions against anonymous role/permission enumeration.
-- Authenticated callers may query only their own identity; service_role remains trusted for server-side administration.

create or replace function public.has_role(user_id uuid, role_name text)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if auth.uid() is null and current_setting('request.jwt.claims', true)::jsonb->>'role' is distinct from 'service_role' then
    raise exception 'has_role: unauthenticated call';
  end if;
  if current_setting('request.jwt.claims', true)::jsonb->>'role' is distinct from 'service_role' and auth.uid() <> user_id then
    raise exception 'has_role: user_id mismatch';
  end if;
  return exists (
    select 1 from public.user_roles ur
    join public.roles r on ur.role_id = r.id
    where ur.user_id = has_role.user_id and r.name = has_role.role_name
  );
end;
$$;

create or replace function public.has_permission(user_id uuid, permission text)
returns boolean
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if auth.uid() is null and current_setting('request.jwt.claims', true)::jsonb->>'role' is distinct from 'service_role' then
    raise exception 'has_permission: unauthenticated call';
  end if;
  if current_setting('request.jwt.claims', true)::jsonb->>'role' is distinct from 'service_role' and auth.uid() <> user_id then
    raise exception 'has_permission: user_id mismatch';
  end if;
  return exists (
    select 1 from public.user_roles ur
    join public.roles r on ur.role_id = r.id
    where ur.user_id = has_permission.user_id and r.permissions->>has_permission.permission = 'true'
  );
end;
$$;

create or replace function public.get_user_permissions(user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  if auth.uid() is null and current_setting('request.jwt.claims', true)::jsonb->>'role' is distinct from 'service_role' then
    raise exception 'get_user_permissions: unauthenticated call';
  end if;
  if current_setting('request.jwt.claims', true)::jsonb->>'role' is distinct from 'service_role' and auth.uid() <> user_id then
    raise exception 'get_user_permissions: user_id mismatch';
  end if;
  return (
    select jsonb_object_agg(key, value)
    from (
      select key, value
      from public.user_roles ur
      join public.roles r on ur.role_id = r.id
      cross join jsonb_each_text(r.permissions)
      where ur.user_id = get_user_permissions.user_id and value = 'true'
    ) t
  );
end;
$$;

revoke execute on function public.get_user_permissions(uuid) from anon;
revoke execute on function public.has_permission(uuid,text) from anon;
revoke execute on function public.has_role(uuid,text) from anon;
revoke execute on function public.increment_xp(uuid,integer) from anon;
revoke execute on function public.handle_new_user() from anon, authenticated;
