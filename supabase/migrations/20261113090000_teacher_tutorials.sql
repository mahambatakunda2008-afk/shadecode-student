-- Teacher tutorials: authored content (text, images, video links) that goes through review before it is verified.
-- Additive only. Nothing here is shown to students yet; "verified" is the gate for a later publish step.

create table if not exists public.teacher_tutorials (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  subject text check (subject is null or char_length(subject) <= 80),
  topic text check (topic is null or char_length(topic) <= 120),
  blocks jsonb not null default '[]'::jsonb check (jsonb_typeof(blocks) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_tutorials_author_idx on public.teacher_tutorials (author_id);
create index if not exists teacher_tutorials_status_idx on public.teacher_tutorials (status);

alter table public.teacher_tutorials enable row level security;

-- Authors see their own; reviewers (teachers/admins) see everyone's tutorials once they are in review or verified.
create policy "tutorials readable by author or reviewers" on public.teacher_tutorials
  for select to authenticated
  using (
    author_id = auth.uid()
    or (status in ('in_review', 'verified') and (has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text)))
  );

create policy "teachers create own draft tutorials" on public.teacher_tutorials
  for insert to authenticated
  with check (
    author_id = auth.uid() and status = 'draft'
    and (has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text))
  );

-- Authors may edit while the tutorial is a draft or in review, but can never move it to 'verified' themselves.
create policy "authors edit own tutorials" on public.teacher_tutorials
  for update to authenticated
  using (author_id = auth.uid() and status in ('draft', 'in_review'))
  with check (author_id = auth.uid() and status in ('draft', 'in_review'));

create policy "admins manage tutorials" on public.teacher_tutorials
  for update to authenticated
  using (has_role(auth.uid(), 'admin'::text))
  with check (has_role(auth.uid(), 'admin'::text));

create policy "authors delete own drafts" on public.teacher_tutorials
  for delete to authenticated
  using ((author_id = auth.uid() and status = 'draft') or has_role(auth.uid(), 'admin'::text));

-- Images for tutorials. Public read (students will need to see them); writes only by teachers/admins into their own folder.
-- No SVG: it can carry scripts. Files are capped at 3 MB (the client also downsizes photos before uploading).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('teacher-media', 'teacher-media', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "teachers upload own media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'teacher-media'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (has_role(auth.uid(), 'teacher'::text) or has_role(auth.uid(), 'admin'::text))
  );

create policy "teachers delete own media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'teacher-media' and (storage.foldername(name))[1] = auth.uid()::text);
