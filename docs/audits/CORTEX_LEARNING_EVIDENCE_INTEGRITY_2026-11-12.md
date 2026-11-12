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
- `20261112182321_add_last_practice_subject_context.sql`
- `20261112182406_add_last_practice_syllabus_context.sql`

All four migrations were applied to the connected production Supabase project and the resulting columns were verified through `information_schema.columns`.

## Regression coverage added

- Tutoring requests do not create completed study sessions or streaks.
- Practice scores do not update formal exam averages or erase existing topic weaknesses when no weakness evidence was produced.
- Practice memory clears stale subject and syllabus attribution when a verified context is unavailable.
- Ungraded practice does not persist a fabricated score.
- Feedback is stored only as bounded text.
- Persistent memory reads and writes keep weak subjects, weak topics, practice scores, and exam averages separate.
- Deterministic scoring refuses to infer correctness from answer length or from a non-matching free-response answer.

## Deployment and verification status

The previously deployed commit `50f57fd109c789e04112b3621b57ef63386451d0` is production READY.

The first deployment attempt for the new Cortex changes reached TypeScript checking and exposed three diagnostics across three fixtures: the newly required `weakSubjects` field broke two legacy `CortexUserMemory` objects, and the tutor test fixture did not yet include the expanded student-memory fields. These were corrected by making the legacy field backward-compatible and completing the tutor fixture.

The earlier Vercel daily deployment limit was subsequently cleared. The production deployment for commit `eeeb544b8a5b57dd59985a656507d409addd9800` is now **READY** at `shadecodestudent.vercel.app`. Its Next.js production build completed successfully, including TypeScript compilation. This does not establish that the Vitest suite passed.

GitHub Actions CI is configured in `.github/workflows/ci.yml` to run typecheck, lint, tests, and build on pushes to main. The available commit-workflow lookup only returns pull-request-triggered runs, so this audit does not claim a passing CI result.

## Verified practice-event integration

- Added a server-only event writer that calls the existing `insert_canonical_cortex_event` RPC using the learner's bearer token and the public Supabase key. It does not use the service-role key for learner event writes.
- A practice event is emitted only when the deterministic scorer returns exactly `100`, and the request includes an attempt ID, subject ID, topic, and verified active syllabus.
- The event ID is deterministic and namespaced by learner, attempt, and question, so retries are idempotent through the existing canonical event RPC.
- The event stores correctness, score, grading method, and syllabus context. It deliberately excludes the student's answer and the reference answer.
- An ungraded answer is not converted into an incorrect answer or a mastery signal. Event-write failures are logged without failing the student's practice response.
- Learner event history is now queried only for the active verified syllabus. Legacy events without syllabus attribution are excluded rather than mixed into the current syllabus.
- The tutor can now use syllabus-scoped repeated-error, recurring-mistake, and observed-spacing evidence when that evidence exists. Spacing remains descriptive and is not presented as proof of mastery or a predicted forgetting date.
- Added unit coverage for event privacy, authenticated RPC arguments, ungraded-answer handling, missing syllabus context, RPC failures, and tutoring continuity. These tests have been added but were not executed in this pass.

The production build for the code above completed and the deployment is READY. A real authenticated learner attempt has not yet been submitted end-to-end, so runtime event insertion and subsequent retrieval remain unverified.

## Remaining follow-up

- Attach verified syllabus IDs to the existing exam-simulation and Learn-quiz event writers so their historical evidence can safely participate in syllabus-scoped memory.
- Add a live authenticated practice attempt and verify the event appears in the learner's next Cortex context exactly once after a retry.
- Add rubric-aware grading for free-response answers before assigning partial or incorrect scores.
- Run the full `npm run verify` suite and capture a successful CI result.
