-- 0027_seed_zimsec_syllabi.sql
-- Seeds ZIMSEC as a second exam board alongside CAIE.
--
-- Note on IDs: unlike CAIE (stable, well-documented numeric codes like 9702),
-- ZIMSEC went through a syllabus review around 2024 and current numeric codes
-- could not be reliably verified from available sources at seed time. Using
-- descriptive slugs instead of guessed numbers avoids seeding wrong codes
-- that would mislead students. Subject names themselves are well-established.
-- Swap in official codes later with a simple UPDATE — no schema change needed.

insert into syllabi (id, subject, board, levels) values
  ('zimsec-mathematics-o', 'Mathematics', 'ZIMSEC', array['O-Level']),
  ('zimsec-english-language-o', 'English Language', 'ZIMSEC', array['O-Level']),
  ('zimsec-combined-science-o', 'Combined Science', 'ZIMSEC', array['O-Level']),
  ('zimsec-biology-o', 'Biology', 'ZIMSEC', array['O-Level']),
  ('zimsec-chemistry-o', 'Chemistry', 'ZIMSEC', array['O-Level']),
  ('zimsec-physics-o', 'Physics', 'ZIMSEC', array['O-Level']),
  ('zimsec-geography-o', 'Geography', 'ZIMSEC', array['O-Level']),
  ('zimsec-history-o', 'History', 'ZIMSEC', array['O-Level']),
  ('zimsec-accounting-o', 'Accounting', 'ZIMSEC', array['O-Level']),
  ('zimsec-business-studies-o', 'Business Studies', 'ZIMSEC', array['O-Level']),
  ('zimsec-commerce-o', 'Commerce', 'ZIMSEC', array['O-Level']),
  ('zimsec-shona-o', 'Shona', 'ZIMSEC', array['O-Level']),
  ('zimsec-ndebele-o', 'Ndebele', 'ZIMSEC', array['O-Level']),
  ('zimsec-computer-science-o', 'Computer Science', 'ZIMSEC', array['O-Level']),
  ('zimsec-agriculture-o', 'Agriculture', 'ZIMSEC', array['O-Level']),
  ('zimsec-mathematics-a', 'Mathematics', 'ZIMSEC', array['A-Level']),
  ('zimsec-physics-a', 'Physics', 'ZIMSEC', array['A-Level']),
  ('zimsec-chemistry-a', 'Chemistry', 'ZIMSEC', array['A-Level']),
  ('zimsec-biology-a', 'Biology', 'ZIMSEC', array['A-Level']),
  ('zimsec-geography-a', 'Geography', 'ZIMSEC', array['A-Level']),
  ('zimsec-economics-a', 'Economics', 'ZIMSEC', array['A-Level']),
  ('zimsec-accounting-a', 'Accounting', 'ZIMSEC', array['A-Level']),
  ('zimsec-computer-science-a', 'Computer Science', 'ZIMSEC', array['A-Level'])
on conflict (id) do nothing;
