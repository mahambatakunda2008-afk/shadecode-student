-- Teacher tutorial studio: versioned, block-based tutorials with private media.
-- Additive only. Existing lesson_library publication remains unchanged.
create table if not exists public.teacher_tutorials (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 180),
  subject text not null check (char_length(subject) between 1 and 120),
  topic text check (topic is null or char_length(topic) <= 180),
  summary text not null default '' check (char_length(summary) <= 1200),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  status text not null default 'draft' check (status in ('draft','in_review','verified','published','changes_requested','rejected')),
  version integer not null default 1 check (version > 0),
  submitted_at timestamptz,
  verified_at timestamptz,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_tutorials_author_updated_idx
  on public.teacher_tutorials(author_id, updated_at desc);
create index if not exists teacher_tutorials_status_updated_idx
  on public.teacher_tutorials(status, updated_at desc);

alter table public.teacher_tutorials enable row level security;

drop policy if exists "authors read own tutorials" on public.teacher_tutorials;
create policy "authors read own tutorials" on public.teacher_tutorials
  for select to authenticated using (author_id = auth.uid());

drop policy if exists "reviewers read submitted tutorials" on public.teacher_tutorials;
create policy "reviewers read submitted tutorials" on public.teacher_tutorials
  for select to authenticated using (
    has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text)
  );

drop policy if exists "authors create own draft tutorials" on public.teacher_tutorials;
create policy "authors create own draft tutorials" on public.teacher_tutorials
  for insert to authenticated with check (
    author_id = auth.uid()
    and status = 'draft'
    and version = 1
    and published_at is null
    and published_by is null
  );

drop policy if exists "authors edit own unsubmitted tutorials" on public.teacher_tutorials;
create policy "authors edit own unsubmitted tutorials" on public.teacher_tutorials
  for update to authenticated using (
    author_id = auth.uid() and status in ('draft','changes_requested')
  ) with check (
    author_id = auth.uid() and status in ('draft','changes_requested','in_review')
    and published_at is null and published_by is null
  );

drop policy if exists "reviewers verify or return tutorials" on public.teacher_tutorials;
create policy "reviewers verify or return tutorials" on public.teacher_tutorials
  for update to authenticated using (
    status = 'in_review'
    and (has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text))
  ) with check (
    status in ('verified','changes_requested','rejected')
    and (has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text))
  );

drop policy if exists "admins publish verified tutorials" on public.teacher_tutorials;
create policy "admins publish verified tutorials" on public.teacher_tutorials
  for update to authenticated using (
    status = 'verified' and has_role(auth.uid(), 'admin'::text)
  ) with check (
    status = 'published' and has_role(auth.uid(), 'admin'::text)
    and published_at is not null and published_by = auth.uid()
  );

create table if not exists public.teacher_tutorial_reviews (
  id uuid primary key default gen_random_uuid(),
  tutorial_id uuid not null references public.teacher_tutorials(id) on delete cascade,
  tutorial_version integer not null check (tutorial_version > 0),
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  verdict text not null check (verdict in ('verified','changes_requested','rejected')),
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (tutorial_id, tutorial_version, reviewer_id)
);

create index if not exists teacher_tutorial_reviews_tutorial_idx
  on public.teacher_tutorial_reviews(tutorial_id, tutorial_version, created_at desc);
alter table public.teacher_tutorial_reviews enable row level security;

drop policy if exists "tutorial authors and reviewers read review history" on public.teacher_tutorial_reviews;
create policy "tutorial authors and reviewers read review history" on public.teacher_tutorial_reviews
  for select to authenticated using (
    exists (select 1 from public.teacher_tutorials t where t.id = tutorial_id and t.author_id = auth.uid())
    or has_role(auth.uid(), 'teacher'::text)
    or has_role(auth.uid(), 'admin'::text)
  );

drop policy if exists "reviewers record own tutorial reviews" on public.teacher_tutorial_reviews;
create policy "reviewers record own tutorial reviews" on public.teacher_tutorial_reviews
  for insert to authenticated with check (
    reviewer_id = auth.uid()
    and (has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text))
    and exists (
      select 1 from public.teacher_tutorials t
      where t.id = tutorial_id and t.status = 'in_review' and t.version = tutorial_version
    )
  );

-- A private bucket. Signed URLs are short-lived and are only issued by authenticated server routes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teacher-media',
  'teacher-media',
  false,
  52428800,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/webm','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "teachers upload media into own folder" on storage.objects;
create policy "teachers upload media into own folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'teacher-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text))
  );

drop policy if exists "authors and reviewers read teacher media" on storage.objects;
create policy "authors and reviewers read teacher media" on storage.objects
  for select to authenticated using (
    bucket_id = 'teacher-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or has_role(auth.uid(), 'teacher'::text)
      or has_role(auth.uid(), 'admin'::text)
    )
  );

drop policy if exists "authors delete own teacher media" on storage.objects;
create policy "authors delete own teacher media" on storage.objects
  for delete to authenticated using (
    bucket_id = 'teacher-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text))
  );

-- Prevent authors from silently changing the content after review or publication.
create or replace function public.bump_teacher_tutorial_version()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.blocks is distinct from old.blocks
     or new.title is distinct from old.title
     or new.subject is distinct from old.subject
     or new.topic is distinct from old.topic
     or new.summary is distinct from old.summary then
    new.version := old.version + 1;
    if old.status in ('verified','published') then
      raise exception 'Verified or published tutorials must be copied into a new draft before editing';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists teacher_tutorial_version_guard on public.teacher_tutorials;
create trigger teacher_tutorial_version_guard
before update on public.teacher_tutorials
for each row execute function public.bump_teacher_tutorial_version();

create or replace function public.touch_teacher_tutorial_submission()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'in_review' and old.status in ('draft','changes_requested') then
    new.submitted_at := now();
  elsif new.status = 'verified' then
    new.verified_at := now();
  elsif new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists teacher_tutorial_submission_timestamps on public.teacher_tutorials;
create trigger teacher_tutorial_submission_timestamps
before update on public.teacher_tutorials
for each row execute function public.touch_teacher_tutorial_submission();
