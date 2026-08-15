# Assessment Evidence Contract

**Status:** Domain contract, August 2026

## Purpose

Create one evidence shape that can represent school exams, verified past papers and tertiary assignments/practicals without forcing all assessment into the existing exam database model.

The contract is intentionally non-persistent. Producers can adopt it incrementally; persistence and migrations require a separate schema audit.

## Evidence flow

```text
Assessment source
  -> Assessment context
  -> Question/evidence records
  -> AssessmentEvidence
  -> topic-level evidence
  -> existing topic_mastery
  -> Cortex recommendations
```

## Sources

- `past_paper`: imported/verified examination material.
- `exam_simulation`: Shadecode-generated exam attempts.
- `teacher_assessment`: educator-created assessment.
- `student_self_assessment`: learner-reported evidence.
- `ai_generated`: AI-created assessment. This source must never be silently treated as verified past-paper evidence.

## Context fields

The contract can carry:

- assessment type;
- course/module and academic period;
- qualification and syllabus;
- examination board;
- paper identifier;
- year/session.

Not every assessment needs every field.

## Question evidence

Each evidence record may contain:

- question identifier and type;
- topic/topic ID;
- maximum marks;
- awarded marks;
- percentage;
- correctness;
- learner answer;
- feedback/model answer;
- time spent.

The evidence layer is deliberately separate from mastery. A question says what happened in an attempt; `topic_mastery` remains the current mastery state.

## Provenance

Imported material should retain provenance where available:

- document ID/path;
- source document;
- verification state.

The Exam Hub ingestion path already resolves Cambridge qualification level from the canonical `syllabus_papers` table rather than guessing when metadata is missing. It also aborts ingestion for unresolved qualification mappings. This contract preserves the same conservative principle.

## Current repository integration

Existing exam marking already computes overall scores and per-topic scores, then persists exam evidence and updates `topic_mastery`. The new contract does not replace that path yet. It provides the shared domain boundary needed to generalize the same intelligence to non-exam assessments.

## Next implementation slice

1. Build an adapter from the current exam-marking result shape into `AssessmentEvidence`.
2. Preserve one stable assessment/attempt ID through Cortex events, exam memory and mastery evidence.
3. Audit actual `past_papers`, `syllabus_papers` and any question tables before proposing persistence changes.
4. Add verified provenance and curriculum/topic mapping only where source data supports it.
5. Only then consider a persistent assessment-evidence table or broader schema migration.

## Guardrails

- Never infer a curriculum topic from a filename.
- Never treat AI-generated questions as verified past papers.
- Never overwrite mastery state with raw evidence.
- Never create a second mastery system.
- Do not make institution-specific schemas part of this contract.
