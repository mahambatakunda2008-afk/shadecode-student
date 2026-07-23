-- 0028_seed_cambridge_igcse_syllabi.sql
-- Cambridge IGCSE uses entirely different syllabus codes from AS/A Level
-- (0xxx vs 9xxx), even for the same subject name, so these are separate
-- syllabi rows, not new levels bolted onto the existing 9xxx codes.
-- Codes verified against multiple current sources (Cambridge International
-- itself, school syllabus charts) — these are stable, well-documented
-- codes, unlike ZIMSEC's which are still pending verification.

insert into syllabi (id, subject, board, levels) values
  ('0580', 'Mathematics', 'CAIE', array['IGCSE']),
  ('0606', 'Additional Mathematics', 'CAIE', array['IGCSE']),
  ('0625', 'Physics', 'CAIE', array['IGCSE']),
  ('0620', 'Chemistry', 'CAIE', array['IGCSE']),
  ('0610', 'Biology', 'CAIE', array['IGCSE']),
  ('0653', 'Combined Science', 'CAIE', array['IGCSE']),
  ('0654', 'Coordinated Sciences', 'CAIE', array['IGCSE']),
  ('0500', 'English First Language', 'CAIE', array['IGCSE']),
  ('0455', 'Economics', 'CAIE', array['IGCSE']),
  ('0450', 'Business Studies', 'CAIE', array['IGCSE']),
  ('0478', 'Computer Science', 'CAIE', array['IGCSE']),
  ('0417', 'Information and Communication Technology', 'CAIE', array['IGCSE']),
  ('0452', 'Accounting', 'CAIE', array['IGCSE'])
on conflict (id) do nothing;
