create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated nologin;
  end if;
end $$;

create table auth.users (
  id uuid primary key, aud text, role text, email text unique,
  encrypted_password text, email_confirmed_at timestamptz,
  created_at timestamptz, updated_at timestamptz
);

create or replace function auth.uid()
returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;

create table public.subjects (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  name text not null
);
create table public.tasks (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  subject_id uuid references public.subjects(id),
  title text not null default '',
  completed boolean not null default false
);
create table public.learn_lessons (
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  subject_id uuid not null references public.subjects(id),
  topic text,
  title text not null default '',
  description text not null default '',
  difficulty text not null default 'medium'
    constraint learn_lessons_difficulty_check check (difficulty in ('easy','medium','hard')),
  progress integer not null default 0 check (progress between 0 and 100),
  blocks jsonb,
  updated_at timestamptz not null default now()
);
create table public.sync_revisions (
  user_id uuid not null references auth.users(id),
  store text not null,
  record_id text not null,
  version bigint not null default 0,
  device_id text not null,
  client_version bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, store, record_id)
);
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.subjects, public.tasks, public.learn_lessons, public.sync_revisions to authenticated;
