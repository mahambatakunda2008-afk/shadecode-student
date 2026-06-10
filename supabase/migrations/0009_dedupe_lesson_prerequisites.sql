-- Dedupe and remove self-referential rows from lesson_prerequisites
-- Run before applying the UNIQUE/CHECK constraint migration (0008).
-- This is idempotent and safe to run multiple times.

BEGIN;

-- 1) Remove explicit self-referential rows
DELETE FROM public.lesson_prerequisites
WHERE lesson_id = prerequisite_lesson_id;

-- 2) Remove duplicate rows keeping the row with the lowest id
WITH numbered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY lesson_id, prerequisite_lesson_id ORDER BY id) AS rn
  FROM public.lesson_prerequisites
)
DELETE FROM public.lesson_prerequisites
WHERE id IN (SELECT id FROM numbered WHERE rn > 1);

COMMIT;

-- After running this migration, apply 0008_add_constraints_lesson_prerequisites.sql to add
-- UNIQUE and CHECK constraints.
