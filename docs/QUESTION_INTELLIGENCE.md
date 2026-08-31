# Question Intelligence Contract

## Purpose

Turn legitimate past-paper content into machine-readable assessment evidence and expose that evidence to Cortex without inventing curriculum mappings.

## Pipeline

`past_papers -> PDF extraction -> exam_questions -> verified topic mapping -> attempts -> topic_mastery -> Cortex recommendations`

## Current guarantees

- Question extraction is deterministic and conservative.
- Ingestion defaults to dry-run.
- `--apply` is required before database writes.
- `(paper_id, question_number)` is the canonical duplicate boundary.
- Marks are retained only when explicitly detected.
- Topic, subtopic and difficulty remain null when evidence is unavailable.
- Source page provenance is retained for extracted questions.
- The authenticated question API only exposes records permitted by Supabase RLS.
- Search is capped at 50 results per request.
- Cortex question help uses the indexed question text as its evidence instead of asking the model to reconstruct the paper.
- Cortex paper analysis reads indexed questions and returns an analysis without silently writing AI guesses into curriculum fields.
- Gemini is the first provider; the existing OpenAI fallback is used only when configured.

## Cortex integration

`POST /api/exam-hub/cortex` supports two modes:

### `question-help`

Input: `subject`, `question`.

Returns structured learning support: concept, hint, method, worked explanation, final answer and an exam tip.

### `paper-analysis`

Input: `paperId`, optional `subject`.

The route loads up to 80 indexed questions for the authenticated paper and asks Cortex to identify observable topics, repeated question patterns, high-yield revision areas and a practical revision plan. The response explicitly treats recurrence as evidence, not a guaranteed prediction.

## Mapping policy

A question may be mapped to a curriculum topic only when there is an evidence-backed mapping source. The system must not infer a topic merely because an AI model believes the question is about it.

Acceptable evidence includes:

1. Explicit human/admin mapping.
2. Deterministic syllabus/question metadata.
3. A reviewed mapping table with provenance.
4. A model suggestion that remains pending until reviewed.

AI paper analysis is therefore advisory. It does not populate `exam_questions.topic_id` or approve `exam_question_topic_proposals`.

## Failure behavior

Malformed PDFs, ambiguous metadata, duplicate papers and unsupported filenames must fail closed and appear in the ingestion report. They must never produce fabricated question metadata.

If a paper has no indexed questions, Cortex paper analysis returns a clear indexing-required response instead of attempting to read the PDF indirectly.
