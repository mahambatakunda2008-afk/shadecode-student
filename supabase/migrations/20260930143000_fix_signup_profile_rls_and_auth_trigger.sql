-- Fix signup/profile RLS interaction when email confirmation is enabled.
-- Auth creates the profile through the auth.users trigger; the browser must not
-- attempt an unauthenticated profiles write before email confirmation.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, xp, level, streak)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      'Student'
    ),
    0,
    1,
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy if exists "Users can manage own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Authenticated users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Authenticated users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
