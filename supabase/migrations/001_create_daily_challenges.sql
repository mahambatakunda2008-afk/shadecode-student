create table public.daily_challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  xp_reward integer not null,
  date date not null unique, -- Ensures only one challenge per day
  type text not null
);

alter table public.daily_challenges enable row level security;

create policy "Allow read access for all users" on public.daily_challenges for select using (true);