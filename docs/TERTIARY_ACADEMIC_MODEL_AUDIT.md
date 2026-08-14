# Tertiary Academic Model — Existing-System Audit

**Status:** Audit complete, implementation boundary confirmed  
**Date:** August 2026

## Executive finding

Shadecode already contains useful academic primitives, but the current data flow remains primarily **profile → subject → lesson/topic → assessment evidence**. It does not yet expose a first-class tertiary hierarchy of institution → programme/qualification → academic period → course/module → assessment.

The correct next step is an additive context layer, not a destructive schema rewrite.

## Existing evidence

### 1. User academic profile

`user_profiles` already stores:

- `education_level`
- `learning_goal`
- `subject_interests`
- onboarding completion state

Onboarding also initializes `learning_paths`.

The canonical education enum currently includes `basic`, `secondary`, `tvet`, `university`, and `self_learning`.

### 2. Important normalization issue

The UI onboarding vocabulary includes `a-level`, but the previous mapping classified it as `university`. That is semantically incorrect.

The Shadecode 2.0 academic context therefore preserves:

```text
persisted education_level: secondary
normalized pathway: a_level
```

A future schema decision can introduce a dedicated persisted A-Level value only if analytics, curriculum, or product behavior proves it necessary.

### 3. Existing learning primitives

The repository already has:

- `subjects`
- `study_topics`
- `learn_lessons`
- `exams`
- `tasks`
- `learning_paths`
- `topic_mastery`
- Cortex memory and exam evidence

These should remain the source systems while the academic context is introduced.

### 4. Mastery is already real infrastructure

`topic_mastery` has a real producer in the exam-marking path and a pure blending algorithm. Exam marking computes topic scores and persists mastery using the existing `(user_id, subject, topic)` uniqueness boundary.

Therefore tertiary work must map course/module topics into this existing mastery layer rather than create a second mastery table.

### 5. Assessment infrastructure already exists

Exam Hub contains board, paper and question administration paths, and the repository contains qualification-mapping tooling for exam ingestion.

The missing piece is a canonical abstraction that can relate an assessment to a course/module, academic period and topic evidence without assuming every assessment is a school examination.

### 6. Offline infrastructure exists, but is incomplete

IndexedDB storage already supports lessons, notes, quizzes, progress, tasks and subjects. A periodic sync layer pushes selected mutations back to Supabase.

The current sync implementation is **not yet a complete synchronization contract**: it lacks a general mutation queue, explicit conflict/version semantics, and a complete offline-first read/write model for academic context.

P2P should therefore remain future research, not a dependency of the current tertiary implementation.

## Canonical target model

```text
Institution (optional)
  └── Qualification / Programme
        └── Academic Period
              └── Course / Module
                    └── Topic
                          ├── Lesson / Resource
                          ├── Question
                          ├── Assessment
                          └── Mastery Evidence
```

## What is missing today

| Capability | Current state | Action |
|---|---|---|
| Education level | Exists | Normalize |
| A-Level distinction | UI only | Preserve in context |
| Institution | Missing | Future persistence |
| Qualification | Missing | Future persistence |
| Programme | Missing | Future persistence |
| Academic period | Missing | Future persistence |
| Course/module | Not first-class | Add via context first |
| Credits | Missing | Optional future field |
| Assessment types | Exam-centric | Generalize domain model |
| Topic mastery | Exists | Reuse |
| Past-paper mapping | Tooling exists | Audit and strengthen |
| Offline persistence | Partial | Define sync contract |

## Immediate implementation boundary

1. Keep the normalized academic context non-persistent.
2. Feed that context into Cortex before changing database schema.
3. Add tests for secondary, A-Level, university, TVET and independent learning.
4. Audit actual consumer requirements.
5. Add persistence only for fields demonstrated to be needed by real flows.

## Next engineering slice

**Assessment Intelligence Audit** is next.

Specifically:

- inspect Exam Hub paper/question structures;
- inspect qualification mapping and syllabus ingestion;
- determine what question metadata is currently available;
- identify the smallest canonical assessment/question/topic contract;
- connect it to existing `topic_mastery` without duplicating mastery state.

## Decision

Do **not** create university-specific tables yet. The existing product has enough infrastructure to begin with a normalized domain contract, and the audit confirms that this is the lowest-risk path toward a genuine multi-education-level Shadecode architecture.
