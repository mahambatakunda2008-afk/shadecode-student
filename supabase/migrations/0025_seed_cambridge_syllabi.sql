-- 0025_seed_cambridge_syllabi.sql
-- Seeds the syllabus catalog with common Cambridge AS/A Level codes.
-- This is public syllabus metadata (codes/names), not copyrighted paper
-- content — no actual PDFs are bundled here. Papers get added via the
-- ingestion path once files are sourced.

insert into syllabi (id, subject, board, levels) values
  ('9702', 'Physics', 'CAIE', array['AS Level', 'A Level']),
  ('9701', 'Chemistry', 'CAIE', array['AS Level', 'A Level']),
  ('9700', 'Biology', 'CAIE', array['AS Level', 'A Level']),
  ('9709', 'Mathematics', 'CAIE', array['AS Level', 'A Level']),
  ('9231', 'Further Mathematics', 'CAIE', array['AS Level', 'A Level']),
  ('9093', 'English Language', 'CAIE', array['AS Level', 'A Level']),
  ('9990', 'Psychology', 'CAIE', array['AS Level', 'A Level']),
  ('9708', 'Economics', 'CAIE', array['AS Level', 'A Level']),
  ('9706', 'Accounting', 'CAIE', array['AS Level', 'A Level']),
  ('9695', 'English Literature', 'CAIE', array['AS Level', 'A Level']),
  ('9489', 'History', 'CAIE', array['AS Level', 'A Level']),
  ('9696', 'Geography', 'CAIE', array['AS Level', 'A Level']),
  ('9618', 'Computer Science', 'CAIE', array['AS Level', 'A Level'])
on conflict (id) do nothing;
