# Cortex learning evidence integrity audit

Date: 2026-11-12

## Changes implemented directly on main

- A tutoring request records the current topic for continuity but does not increment study sessions, study time, or streaks.
- Practice scores are stored separately from formal examination averages.
- Recent topic, practice score, practice topic, practice subject, verified syllabus identity, and short text feedback have dedicated `cortex_memory` fields.
- Topic weaknesses and subject weaknesses have separate storage fields.
- The deterministic Cortex practice scorer no longer infers correctness from answer length.
- Exact normalized reference-answer matches can be scored. Answers that cannot be reliably graded return a null score and request a marking guide or review.
- The authenticated student context now includes the most recent topic and verifiable practice-score context, scoped by subject and verified syllabus.
- Tutoring continuity uses the latest practice result only when topic, subject, and active syllabus all match. It explicitly avoids treating one exact-answer match as proof of mastery.
- Answer normalization now collapses actual whitespace; ungraded free-response answers are not described as saved for review.

## Database migrations

- `20261112173852_add_cortex_learning_context_fields.sql`
- `20261112174149_separate_cortex_weak_topics_from_subjects.sql`
- `20261112175000_add_last_practice_subject_context.sql`
- `20261112175500_add_last_practice_syllabus_context.sql`

Both migrations were applied to the connected production Supabase project and the resulting columns were verified through `information_schema.columns`.

## Regression coverage added

- Tutoring requests do not create completed study sessions or streaks.
- Practice scores do not update formal exam averages.
- Ungraded practice does not persist a fabricated score.
- Feedback is stored only as bounded text.
- Persistent memory reads and writes keep weak subjects, weak topics, practice scores, and exam averages separate.
- Deterministic scoring refuses to infer correctness from answer length or from a non-matching free-response answer.

## Deployment and verification status

The previously deployed commit `50f57fd109c789e04112b3621b57ef63386451d0` is production READY.

Subsequent commits are on `main`, but Vercel reported a build-rate-limit failure and did not create a deployment for the latest commits. Therefore these changes are **not yet verified in production**.

GitHub Actions CI is configured in `.github/workflows/ci.yml` to run typecheck, lint, tests, and build on pushes to main. The available commit-workflow lookup only returns pull-request-triggered runs, so this audit does not claim a passing CI result.

## Remaining follow-up

- Obtain a successful CI run for the latest main commit.
- Obtain a Vercel production deployment for the latest main commit.
- Add rubric-aware grading for free-response answers before assigning partial or incorrect scores.
- Connect practice attempts to the canonical topic-mastery and durable-event pipeline rather than treating the compact Cortex memory row as the full learning record.
