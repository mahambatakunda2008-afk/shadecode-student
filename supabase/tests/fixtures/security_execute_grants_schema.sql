-- Minimal disposable schema for security_execute_grants_contract.sql.
-- Supabase local startup provides the anon/authenticated/service_role roles.

create table public.challenge_answer_keys (
  challenge_id uuid primary key,
  key jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.challenge_answer_keys enable row level security;
grant all privileges on table public.challenge_answer_keys to anon, authenticated, service_role;

create table public.lesson_votes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null,
  helpful boolean not null
);
create table public.lesson_library (
  id uuid primary key default gen_random_uuid(),
  helpful_up integer not null default 0,
  helpful_down integer not null default 0
);
create table public.learn_lessons (
  id uuid primary key default gen_random_uuid(),
  progress integer not null default 0,
  blocks jsonb not null default '[]'::jsonb
);
create table public.teacher_tutorials (
  id uuid primary key default gen_random_uuid()
);

create function public.apply_lesson_vote()
returns trigger language plpgsql security definer set search_path = public
as $$ begin return null; end $$;
create function public.guard_teacher_tutorial_transition()
returns trigger language plpgsql security definer set search_path = public
as $$ begin return new; end $$;
create function public.publish_lesson_to_library()
returns trigger language plpgsql security definer set search_path = public
as $$ begin return new; end $$;

grant execute on function public.apply_lesson_vote() to public, anon, authenticated, service_role;
grant execute on function public.guard_teacher_tutorial_transition() to public, anon, authenticated, service_role;
grant execute on function public.publish_lesson_to_library() to public, anon, authenticated, service_role;

create trigger lesson_votes_apply
after insert or update or delete on public.lesson_votes
for each row execute function public.apply_lesson_vote();
create trigger teacher_tutorial_transition_guard
before update on public.teacher_tutorials
for each row execute function public.guard_teacher_tutorial_transition();
create trigger learn_lessons_publish_to_library
after insert or update of progress, blocks on public.learn_lessons
for each row execute function public.publish_lesson_to_library();

create function public.insert_canonical_cortex_event(p_user_id uuid, p_event jsonb)
returns jsonb language sql set search_path = public
as $$ select p_event $$;
grant execute on function public.insert_canonical_cortex_event(uuid, jsonb)
to anon, authenticated, service_role;
