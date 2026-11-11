-- 20260919170000 revoked EXECUTE on has_role from authenticated, which broke every admin/teacher check in the app
-- (admin layout, API routes, RLS policies). The function body already rejects unauthenticated calls and any
-- call where user_id differs from auth.uid() (service_role excepted), so a signed-in user can only ask about themselves.
grant execute on function public.has_role(uuid, text) to authenticated;
