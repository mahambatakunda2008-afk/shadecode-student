# Question Intelligence Contract

## Purpose

Turn legitimate past-paper content into machine-readable assessment evidence without inventing curriculum mappings.

## Pipeline

`past_papers -> PDF extraction -> exam_questions -> topic mapping -> attempts -> topic_mastery -> Cortex recommendations`

## Current guarantees

- Question extraction is deterministic and conservative.
- Ingestion defaults to dry-run.
- `--apply` is required before database writes.
- `(paper_id, question_number)` is the canonical duplicate boundary.
- Marks are retained only when explicitly detected.
- Topic, subtopic, difficulty and page are left null when evidence is unavailable.
- The authenticated question API only exposes records permitted by Supabase RLS.
- Search is capped at 50 results per request.

## Mapping policy

A question may be mapped to a curriculum topic only when there is an evidence-backed mapping source. The system must not infer a topic merely because an AI model believes the question is about it.

Acceptable evidence includes:

1. Explicit human/admin mapping.
2. Deterministic syllabus/question metadata.
3. A reviewed mapping table with provenance.
4. A model suggestion that remains pending until reviewed.

## Next mapping stage

Build a reviewable mapping queue rather than silently writing model guesses into `exam_questions.topic_id`.

Each proposed mapping should retain:

- question ID
- proposed topic ID
- confidence
- evidence/source
- model/version if AI-assisted
- reviewer
- review timestamp
- final decision

## Failure behavior

Malformed PDFs, ambiguous metadata, duplicate papers and unsupported filenames must fail closed and appear in the ingestion report. They must never produce fabricated question metadata.
