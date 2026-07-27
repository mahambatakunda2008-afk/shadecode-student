-- 0032_expand_caie_subject_coverage.sql
--
-- Cambridge International offers 50+ AS & A Level subjects; the original
-- seed (0025) only covered 13. This adds a further verified batch —
-- codes checked against Cambridge's own syllabus documents and
-- Cambridge University Press's Advanced (16+) catalogue, not guessed.
--
-- Not exhaustive. Add more as they come up rather than trying to
-- front-load all 50+ speculatively — codes not personally verified
-- shouldn't go in the catalog just to look complete.
--
-- Already applied directly to production; this file exists so
-- supabase/migrations/ stays the source of truth.

INSERT INTO syllabi (id, subject, board, levels) VALUES
  ('9609', 'Business', 'CAIE', ARRAY['AS and A Level']),
  ('9607', 'Media Studies', 'CAIE', ARRAY['AS and A Level']),
  ('9626', 'Information Technology', 'CAIE', ARRAY['AS and A Level']),
  ('9868', 'Chinese Language and Literature', 'CAIE', ARRAY['A Level']),
  ('9239', 'Global Perspectives and Research', 'CAIE', ARRAY['AS and A Level']),
  ('9694', 'Thinking Skills', 'CAIE', ARRAY['AS and A Level']),
  ('8291', 'Environmental Management', 'CAIE', ARRAY['AS Level']),
  ('8022', 'Spanish Language', 'CAIE', ARRAY['AS Level'])
ON CONFLICT (id) DO NOTHING;
