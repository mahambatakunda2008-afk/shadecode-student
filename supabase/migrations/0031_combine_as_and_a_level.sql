-- 0031_combine_as_and_a_level.sql
--
-- Product decision: AS and A Level are one qualification pathway in
-- ExamHub, not two separate browse options. A student choosing "Level"
-- for e.g. Physics 9702 should see one "AS and A Level" entry, not have
-- to pick between "AS Level" and "A Level" as if they were unrelated.
--
-- Already applied directly to production; this file exists so
-- supabase/migrations/ stays the source of truth.

UPDATE syllabi
SET levels = ARRAY['AS and A Level']
WHERE board = 'CAIE' AND levels = ARRAY['AS Level', 'A Level'];

-- Any papers already catalogued under the old split values need to move
-- to the combined value too, or they'd become unreachable from the browse
-- UI (which reads available levels from syllabi.levels).
UPDATE past_papers
SET level = 'AS and A Level'
WHERE level IN ('AS Level', 'A Level')
  AND syllabus_id IN (SELECT id FROM syllabi WHERE board = 'CAIE' AND levels = ARRAY['AS and A Level']);

UPDATE community_uploads
SET level = 'AS and A Level'
WHERE level IN ('AS Level', 'A Level')
  AND syllabus_id IN (SELECT id FROM syllabi WHERE board = 'CAIE' AND levels = ARRAY['AS and A Level']);
