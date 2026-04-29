create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade not null,
  insight_text text not null,
  created_at timestamp with time zone default now() not null,
  subject_id uuid references public.subjects (id) on delete set null, -- Optional, insight might not always be tied to a specific subject
  type text not null default 'behavioral' -- e.g., 'behavioral', 'summary', 'challenge_related'
);

alter table public.insights enable row level security;

create policy "Allow read access for users on their insights" on public.insights for select using (auth.uid() = user_id);
create policy "Allow insert access for authenticated users" on public.insights for insert with check (auth.uid() = user_id);