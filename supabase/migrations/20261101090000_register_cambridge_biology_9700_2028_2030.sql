-- Register the controlling Cambridge International Biology 9700 syllabus for 2028–2030.
-- This creates only the official source registry entry. The watcher must retrieve the
-- source PDF and persist its real content hash before a curriculum document/version exists.
insert into public.curriculum_sources (
  id, board_id, qualification_id, subject_id, level, syllabus_id, syllabus_version,
  authority, kind, url, allowed_domains, frequency, discover_linked_documents,
  extract_text, auto_promote
)
values (
  'cambridge-as-a-level-biology-9700-2028-2030',
  'cambridge',
  'cambridge-as-a-level',
  'biology',
  'as_a_level',
  'cambridge-9700',
  '2028-2030',
  'Cambridge International Education',
  'pdf',
  'https://www.cambridgeinternational.org/Images/744622-2028-2030-syllabus.pdf',
  array['www.cambridgeinternational.org', 'cambridgeinternational.org'],
  'weekly',
  false,
  true,
  false
)
on conflict (id) do update set
  board_id = excluded.board_id,
  qualification_id = excluded.qualification_id,
  subject_id = excluded.subject_id,
  level = excluded.level,
  syllabus_id = excluded.syllabus_id,
  syllabus_version = excluded.syllabus_version,
  authority = excluded.authority,
  kind = excluded.kind,
  url = excluded.url,
  allowed_domains = excluded.allowed_domains,
  frequency = excluded.frequency,
  discover_linked_documents = excluded.discover_linked_documents,
  extract_text = excluded.extract_text,
  auto_promote = false,
  updated_at = now();
