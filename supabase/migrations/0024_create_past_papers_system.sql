-- 0024_create_past_papers_system.sql
-- Scalable Past Papers catalog. Metadata-driven — supports thousands of
-- papers with zero code changes. New subjects/sessions/years = new rows.

create table if not exists syllabi (
  id text primary key,                 -- e.g. "9702" (CAIE syllabus code)
  subject text not null,               -- "Physics"
  board text not null default 'CAIE',  -- "CAIE" | "ZIMSEC"
  levels text[] not null,              -- ["AS Level", "A Level"]
  created_at timestamptz not null default now()
);

create table if not exists past_papers (
  id uuid primary key default gen_random_uuid(),
  syllabus_id text not null references syllabi(id) on delete cascade,
  level text not null,                 -- "AS Level" | "A Level"
  session text not null,               -- "Feb/March" | "May/June" | "Oct/Nov"
  year int not null,
  paper_number int not null,           -- 2, 3, 4...
  variant int not null,                -- 1, 2, 3
  kind text not null,                  -- "qp" (question paper) | "ms" (mark scheme) | "in" (insert) | "gt" (grade thresholds)
  file_path text not null,             -- Supabase Storage path
  file_size_bytes int,
  page_count int,
  source_url text,                     -- provenance, for takedown/audit trail
  created_at timestamptz not null default now(),
  unique (syllabus_id, level, session, year, paper_number, variant, kind)
);

create index if not exists idx_past_papers_browse
  on past_papers (syllabus_id, level, session, year, paper_number);

-- Per-student interaction — bookmarks, progress, offline flag
create table if not exists user_past_paper_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references past_papers(id) on delete cascade,
  bookmarked boolean not null default false,
  status text not null default 'not_started', -- not_started | in_progress | completed
  last_page int default 1,
  score numeric,
  time_spent_seconds int default 0,
  downloaded_offline boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, paper_id)
);

-- Bookmarking individual questions (page + rough coords, no need to
-- structurally split the PDF into a question bank for v1)
create table if not exists user_saved_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id uuid not null references past_papers(id) on delete cascade,
  page_number int not null,
  note text,
  topic_id text, -- matches CurriculumTopic.id from src/lib/curriculum/*.ts (no DB table exists, so no FK)
  created_at timestamptz not null default now()
);

alter table syllabi enable row level security;
alter table past_papers enable row level security;
alter table user_past_paper_state enable row level security;
alter table user_saved_questions enable row level security;

-- ── Storage bucket for paper PDFs ───────────────────────────────────────────
-- Private bucket: files are served via short-lived signed URLs from the
-- /api/exam-hub/papers/[id] route, never public URLs, so we control access
-- and can revoke/rotate if a source needs to be taken down.
insert into storage.buckets (id, name, public)
values ('past-papers', 'past-papers', false)
on conflict (id) do nothing;

create policy "authenticated read past-papers storage"
  on storage.objects for select
  using (bucket_id = 'past-papers' and auth.role() = 'authenticated');

-- Catalog is public-read (all authenticated students can browse)
create policy "syllabi readable by authenticated" on syllabi
  for select using (auth.role() = 'authenticated');
create policy "papers readable by authenticated" on past_papers
  for select using (auth.role() = 'authenticated');

-- Per-user state is strictly own-row
create policy "own paper state" on user_past_paper_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own saved questions" on user_saved_questions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
