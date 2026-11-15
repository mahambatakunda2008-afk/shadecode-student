-- Historical migration recovery.
-- The hosted Supabase migration ledger records version 20260911112810 as applied,
-- but the original source file is absent from the repository's reachable Git history.
-- This reconstruction is based on the live PostgreSQL catalog (columns, defaults,
-- constraints, indexes, RLS policies, ACLs and table comments) inspected on 2026-11-15.
-- It is included to restore source-control reproducibility. Do not manually replay it
-- against the existing hosted project; its migration ledger already records this version.

create table if not exists public.platform_institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  institution_type text not null default 'school'
    check (institution_type in ('school', 'university', 'polytechnic', 'college', 'tvet', 'vocational', 'training', 'organization')),
  country_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_institution_members (
  institution_id uuid not null references public.platform_institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role text not null
    check (membership_role in ('student', 'teacher', 'parent', 'guardian', 'tutor', 'administrator', 'staff', 'content_author')),
  status text not null default 'active'
    check (status in ('pending', 'active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (institution_id, user_id)
);

create table if not exists public.platform_groups (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.platform_institutions(id) on delete cascade,
  parent_group_id uuid references public.platform_groups(id) on delete set null,
  name text not null,
  group_type text not null default 'class'
    check (group_type in ('class', 'cohort', 'department', 'programme', 'course', 'club', 'study_group', 'other')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_group_members (
  group_id uuid not null references public.platform_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role text not null
    check (membership_role in ('student', 'teacher', 'parent', 'guardian', 'tutor', 'administrator', 'staff')),
  status text not null default 'active'
    check (status in ('pending', 'active', 'suspended', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.platform_user_relationships (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references auth.users(id) on delete cascade,
  related_user_id uuid not null references auth.users(id) on delete cascade,
  relationship_type text not null
    check (relationship_type in ('parent', 'guardian', 'teacher', 'tutor', 'mentor', 'caregiver')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'revoked')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_user_relationships_distinct_users check (subject_user_id <> related_user_id),
  constraint platform_user_relationships_subject_user_id_related_user_id_key
    unique (subject_user_id, related_user_id, relationship_type)
);

create index if not exists platform_institution_members_user_idx
  on public.platform_institution_members (user_id, status);
create index if not exists platform_groups_institution_idx
  on public.platform_groups (institution_id);
create index if not exists platform_group_members_user_idx
  on public.platform_group_members (user_id, status);
create index if not exists platform_user_relationships_subject_idx
  on public.platform_user_relationships (subject_user_id, status);
create index if not exists platform_user_relationships_related_idx
  on public.platform_user_relationships (related_user_id, status);

alter table public.platform_institutions enable row level security;
alter table public.platform_institution_members enable row level security;
alter table public.platform_groups enable row level security;
alter table public.platform_group_members enable row level security;
alter table public.platform_user_relationships enable row level security;

create policy "users can view institutions they belong to"
  on public.platform_institutions for select to authenticated
  using (exists (
    select 1 from public.platform_institution_members m
    where m.institution_id = platform_institutions.id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  ));

create policy "users can view their institution memberships"
  on public.platform_institution_members for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can view groups they belong to"
  on public.platform_groups for select to authenticated
  using (exists (
    select 1 from public.platform_group_members m
    where m.group_id = platform_groups.id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
  ));

create policy "users can view their group memberships"
  on public.platform_group_members for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "users can view their direct relationships"
  on public.platform_user_relationships for select to authenticated
  using ((select auth.uid()) = subject_user_id or (select auth.uid()) = related_user_id);

comment on table public.platform_institutions is
  'Canonical institutions for the multi-client Shadecode platform.';
comment on table public.platform_institution_members is
  'Explicit institution membership. Never inferred from profile fields.';
comment on table public.platform_groups is
  'Classes, cohorts, departments, programmes and other institution-scoped groups.';
comment on table public.platform_group_members is
  'Explicit group membership and role. Used for authorization, not merely display.';
comment on table public.platform_user_relationships is
  'Explicit user-to-user relationships such as parent/guardian/teacher/tutor. Active relationships are required for cross-user access.';

-- Preserve the hosted catalog ACLs. RLS policies remain the row-level boundary.
grant all on table public.platform_institutions to anon, authenticated, service_role;
grant all on table public.platform_institution_members to anon, authenticated, service_role;
grant all on table public.platform_groups to anon, authenticated, service_role;
grant all on table public.platform_group_members to anon, authenticated, service_role;
grant all on table public.platform_user_relationships to anon, authenticated, service_role;
