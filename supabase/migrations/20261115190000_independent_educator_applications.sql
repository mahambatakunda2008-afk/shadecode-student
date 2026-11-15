-- Independent educator applications are separate from school membership and global review roles.
create table if not exists public.platform_educator_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 100),
  educator_type text not null check (educator_type in ('independent_tutor','subject_specialist','independent_teacher','education_creator')),
  bio text not null default '' check (char_length(bio) <= 1600),
  subjects text[] not null default '{}',
  levels text[] not null default '{}',
  experience_years smallint check (experience_years is null or experience_years between 0 and 70),
  status text not null default 'pending' check (status in ('pending','approved','changes_requested','rejected','suspended')),
  review_note text check (review_note is null or char_length(review_note) <= 1200),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_educator_subjects_count check (cardinality(subjects) between 1 and 30),
  constraint platform_educator_levels_count check (cardinality(levels) between 1 and 20)
);
create index if not exists platform_educator_profiles_status_idx
  on public.platform_educator_profiles(status, created_at desc);
alter table public.platform_educator_profiles enable row level security;

drop policy if exists "educators read own profile" on public.platform_educator_profiles;
create policy "educators read own profile" on public.platform_educator_profiles
  for select to authenticated using (user_id = auth.uid() or has_role(auth.uid(), 'admin'::text));

drop policy if exists "educators create own pending application" on public.platform_educator_profiles;
create policy "educators create own pending application" on public.platform_educator_profiles
  for insert to authenticated with check (
    user_id = auth.uid() and status = 'pending' and reviewed_by is null and reviewed_at is null
  );

drop policy if exists "educators update own unreviewed application" on public.platform_educator_profiles;
create policy "educators update own unreviewed application" on public.platform_educator_profiles
  for update to authenticated using (
    user_id = auth.uid() and status in ('pending','changes_requested')
  ) with check (
    user_id = auth.uid() and status in ('pending','changes_requested')
  );

drop policy if exists "admins review educator applications" on public.platform_educator_profiles;
create policy "admins review educator applications" on public.platform_educator_profiles
  for update to authenticated using (has_role(auth.uid(), 'admin'::text))
  with check (has_role(auth.uid(), 'admin'::text));

create or replace function public.guard_platform_educator_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is null or new.user_id <> auth.uid() or new.status <> 'pending' then
      raise exception 'Educator applications must be created by their owner in pending status';
    end if;
    return new;
  end if;

  if auth.uid() = old.user_id then
    if old.status not in ('pending','changes_requested')
       or new.status <> old.status
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Applicants may only edit an application awaiting review or changes';
    end if;
  elsif not has_role(auth.uid(), 'admin'::text) then
    raise exception 'Only administrators may review educator applications';
  else
    if new.status not in ('approved','changes_requested','rejected','suspended')
       or new.reviewed_by is distinct from auth.uid() then
      raise exception 'Invalid educator review decision';
    end if;
    new.reviewed_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists platform_educator_profile_guard on public.platform_educator_profiles;
create trigger platform_educator_profile_guard
before insert or update on public.platform_educator_profiles
for each row execute function public.guard_platform_educator_profile();

create or replace function public.is_approved_independent_educator(p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_educator_profiles p
    where p.user_id = p_user_id and p.status = 'approved'
  );
$$;
revoke all on function public.is_approved_independent_educator(uuid) from public;
grant execute on function public.is_approved_independent_educator(uuid) to authenticated, service_role;

-- This capability permits authoring one's own educational content only.
-- It does not grant institution membership, learner records, global review, or admin access.
