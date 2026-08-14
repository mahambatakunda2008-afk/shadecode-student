# Assessment Intelligence — Audit Baseline

**Status:** Initial audit baseline  
**Date:** August 2026

## Existing assessment pipeline

Shadecode already has several important pieces:

1. Exam simulation and marking.
2. Per-question topic labels in generated exam data.
3. Overall score and grade calculation.
4. Weak/strong area extraction.
5. Per-topic score calculation.
6. Persistence into `cortex_memory.exam_scores`.
7. Persistence into `topic_mastery`.
8. Exam Hub administration for boards, papers and questions.
9. Qualification-mapping tooling in `bin/exam-hub-ingest`.

The exam-marking path is already a producer of topic mastery. It computes topic scores and upserts the existing `topic_mastery` records rather than creating a new mastery system.

## Current limitation

The current marking prompt receives a topic string with each question, but the assessment model is still fundamentally exam-oriented. A tertiary assessment such as an assignment, laboratory, project or presentation needs the same evidence pipeline without pretending it is an exam.

The target abstraction is therefore:

```text
Assessment
 ├── assessment type
 ├── course/module
 ├── academic period
 ├── dates / deadline
 ├── weight (optional)
 ├── questions or evidence
 ├── result (optional)
 └── topic links
```

## Existing question-level evidence

The exam marking flow currently has enough information to calculate:

- question identifier
- question type
- maximum marks
- topic label
- student answer
- time spent
- awarded score
- correctness
- feedback
- model answer

This is sufficient to start defining a canonical evidence contract without rewriting the marking system.

## Past-paper / curriculum infrastructure

The repository contains Exam Hub administration and qualification-mapping tooling. The mapping utilities indicate that ingestion is already intended to connect examination material to qualifications.

The next audit should verify the actual persisted fields and production data for:

- board
- qualification
- paper
- subject
- year/session
- question
- mark allocation
- topic mapping
- syllabus mapping
- mark scheme availability

Do not infer missing data from filenames alone.

## Canonical direction

Assessment intelligence should eventually answer:

> Which curriculum concepts does this assessment measure, what evidence do we have about the learner's performance on those concepts, and what should happen next?

That output should feed the existing mastery and recommendation systems.

## Guardrails

- Do not invent curriculum mappings where evidence is unavailable.
- Do not treat AI-generated questions as equivalent to verified past-paper questions.
- Preserve provenance for imported material.
- Keep assessment type explicit.
- Keep question/topic evidence separate from mastery state.
- Reuse `topic_mastery` as the current mastery source of truth.

## Next slice

Inspect the actual Exam Hub question/paper/qualification persistence paths and produce a field-level contract before any new assessment tables or migrations are proposed.
