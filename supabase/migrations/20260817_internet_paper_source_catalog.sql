create table if not exists public.paper_sources (
  id uuid primary key default gen_random_uuid(),
  board text not null,
  syllabus_id text references public.syllabi(id) on delete set null,
  title text not null,
  source_url text not null unique,
  source_kind text not null default 'past_paper' check (source_kind in ('past_paper','specimen','syllabus','examiner_report','other')),
  access_mode text not null default 'external_link' check (access_mode in ('external_link','licensed_download','public_domain','author_provided')),
  rights_note text,
  year integer,
  session text,
  paper_number integer,
  variant integer,
  active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paper_sources_syllabus_idx on public.paper_sources(syllabus_id);
create index if not exists paper_sources_board_idx on public.paper_sources(board);
create index if not exists paper_sources_active_idx on public.paper_sources(active);

alter table public.paper_sources enable row level security;

drop policy if exists "paper_sources_authenticated_read" on public.paper_sources;
create policy "paper_sources_authenticated_read" on public.paper_sources
  for select to authenticated using (active = true);

drop policy if exists "paper_sources_admin_write" on public.paper_sources;
create policy "paper_sources_admin_write" on public.paper_sources
  for all to authenticated
  using (exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.user_id = auth.uid() and r.name = 'admin'))
  with check (exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.user_id = auth.uid() and r.name = 'admin'));

insert into public.paper_sources (board, syllabus_id, title, source_url, source_kind, access_mode, rights_note)
values
 ('CAIE','9709','Cambridge International AS & A Level Mathematics 9709: Past papers','https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/past-papers/','past_paper','external_link','Cambridge states that website publication of its past papers is not permitted; Shadecode links users to the official source rather than copying the papers.'),
 ('CAIE','9702','Cambridge International AS & A Level Physics 9702: Qualification and assessment resources','https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-physics-9702/','past_paper','external_link','Public page; deeper past-paper access may require School Support Hub access.'),
 ('CAIE','9618','Cambridge International AS & A Level Computer Science 9618: Past papers','https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-computer-science-9618/past-papers/','past_paper','external_link','Cambridge states that website publication of its past papers is not permitted; Shadecode links users to the official source rather than copying the papers.'),
 ('ZIMSEC',null,'ZIMSEC public documents','https://website.zimsec.co.zw/documents/','other','external_link','External source catalog only; individual documents are surfaced according to their published access terms.')
on conflict (source_url) do update set title=excluded.title, rights_note=excluded.rights_note, updated_at=now(), last_verified_at=now(), active=true;