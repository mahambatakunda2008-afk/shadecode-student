-- Keep the onboarding profile present for every Auth user and harden its RLS.
insert into public.user_profiles (user_id)
select u.id
from auth.users u
left join public.user_profiles p on p.user_id = u.id
where p.user_id is null
on conflict (user_id) do nothing;

drop policy if exists "Users can insert own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;
drop policy if exists "Users can view own profile" on public.user_profiles;

create policy "Authenticated users can view own profile"
  on public.user_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Authenticated users can insert own profile"
  on public.user_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Authenticated users can update own profile"
  on public.user_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_user_profile on auth.users;
create trigger on_auth_user_created_user_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
