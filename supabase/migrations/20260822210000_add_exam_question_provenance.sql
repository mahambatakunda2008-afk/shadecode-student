-- Preserve question-level extraction provenance without creating a parallel question entity.
alter table public.exam_questions
  add column if not exists source_page_start integer,
  add column if not exists source_page_end integer,
  add column if not exists extraction_method text,
  add column if not exists extraction_confidence numeric,
  add column if not exists source_text_hash text,
  add column if not exists extracted_at timestamptz;

alter table public.exam_questions
  drop constraint if exists exam_questions_extraction_confidence_check;

alter table public.exam_questions
  add constraint exam_questions_extraction_confidence_check
  check (extraction_confidence is null or (extraction_confidence >= 0 and extraction_confidence <= 1));

alter table public.exam_questions
  drop constraint if exists exam_questions_source_page_range_check;

alter table public.exam_questions
  add constraint exam_questions_source_page_range_check
  check (
    source_page_start is null
    or source_page_end is null
    or (source_page_start > 0 and source_page_end >= source_page_start)
  );

create index if not exists exam_questions_source_hash_idx
  on public.exam_questions (paper_id, source_text_hash);
