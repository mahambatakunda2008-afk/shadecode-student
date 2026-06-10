-- Add UNIQUE and CHECK constraints to lesson_prerequisites to prevent duplicates and self-links

ALTER TABLE public.lesson_prerequisites
  ADD CONSTRAINT lesson_prerequisites_unique UNIQUE (lesson_id, prerequisite_lesson_id);

ALTER TABLE public.lesson_prerequisites
  ADD CONSTRAINT lesson_prerequisites_no_self CHECK (lesson_id <> prerequisite_lesson_id);

-- Note: If applying to a live DB, verify constraints do not conflict with existing data.
-- If duplicates exist, deduplicate before applying migration.
