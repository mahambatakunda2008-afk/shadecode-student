# Assessment Intelligence & Past-Paper Audit

Date: 2026-08-16
Status: discovery/audit complete

## Live database findings

The production Supabase project already has a substantial assessment foundation:

- `past_papers`: 58 rows
- `syllabi`: 57 rows
- `exam_questions`: 0 rows
- `user_past_paper_state`: 7 rows
- `past_papers` → `syllabi` mapping: 58/58 papers mapped, 0 orphaned
- `syllabi.board`: 34 CAIE, 23 ZIMSEC
- `past_papers.kind`: 57 question papers (`qp`), 1 mark scheme (`ms`)
- all current past-paper records have a non-empty file path
- all current past papers are labelled `AS and A Level`

## Current schema

### `syllabi`

Provides the curriculum identity:

- id
- subject
- board
- levels

### `past_papers`

Provides paper-level provenance and retrieval metadata:

- syllabus_id
- level
- session
- year
- paper_number
- variant
- kind
- file_path
- source_url
- file/page/size metadata

### `exam_questions`

Already provides the intended machine-readable question layer:

- paper_id
- question_number
- page_number
- topic_id
- subtopic
- difficulty
- marks
- question_text
- full-text search vector

The important finding is that this table is currently empty. Therefore question-level intelligence is not yet data-backed.

### `user_past_paper_state`

Already records learner interaction with a paper:

- bookmarked
- status
- last_page
- score
- time_spent_seconds
- downloaded_offline
- updated_at

This is enough to seed learner-level assessment behavior once question-level evidence exists.

## Canonical assessment graph

```text
syllabus
  └── past_paper
       └── exam_question
            ├── topic
            ├── subtopic
            ├── difficulty
            └── marks

student
  └── user_past_paper_state
       └── paper interaction / score

future question attempt evidence
  └── question → answer → score/error → topic mastery
```

Do not create a parallel `questions` table. `exam_questions` is the existing canonical question entity.

## Immediate gaps

### P0: populate `exam_questions`

The first real implementation blocker is ingestion/extraction, not prediction.

For each legitimate paper:

1. identify the paper;
2. extract question boundaries;
3. preserve question numbering;
4. preserve page references;
5. attach marks where recoverable;
6. map to a real syllabus/topic where evidence exists;
7. store difficulty only when supported by a defined rule or human/content metadata;
8. preserve provenance and extraction confidence.

No AI-generated question text should be treated as source content.

### P1: mark-scheme pairing

Current storage has 57 QPs but only 1 MS. A question-level marking system therefore cannot yet assume a complete mark scheme corpus.

Pairing should use stable paper identity:

`board + syllabus + level + year + session + paper_number + variant + kind`

### P1: topic mapping

`exam_questions.topic_id` and `subtopic` already anticipate topic mapping. The mapping should reference existing curriculum/mastery identifiers where possible rather than creating another topic taxonomy.

### P1: question attempt evidence

The current learner state is paper-level. For assessment intelligence, add question-attempt evidence only when the product has an actual question interaction path. Do not add speculative tables merely to satisfy the architecture.

### P2: assessment intelligence

Only after question evidence exists should Cortex derive:

- recurring weak topics
- mark-loss patterns
- difficulty calibration
- time-per-mark behavior
- likely revision priorities
- assessment readiness signals

These must be evidence-backed, not generic AI predictions.

## Data-quality rules

- Never fabricate missing question text.
- Never infer a topic when the curriculum mapping is ambiguous without recording uncertainty.
- Keep source paper and extraction provenance.
- Keep question numbering stable.
- Treat mark schemes as separate source artifacts linked by canonical paper identity.
- Keep user attempt data isolated by `auth.uid()`.

## Acceptance criteria for the next phase

Assessment intelligence is ready to move beyond audit when:

- the existing 58 papers remain fully mapped to syllabi;
- question extraction produces real `exam_questions` rows;
- question-to-topic mappings use existing curriculum identifiers;
- provenance and extraction confidence are preserved;
- QP/MS pairing is explicit rather than assumed;
- learner question attempts can be connected to topic evidence;
- Cortex recommendations are based on actual assessment evidence.

## Conclusion

The past-paper system is **not missing from scratch**. The real bottleneck is that the existing paper-level corpus has not yet been converted into a populated, trustworthy question-level corpus. That is the next assessment-engineering target.
