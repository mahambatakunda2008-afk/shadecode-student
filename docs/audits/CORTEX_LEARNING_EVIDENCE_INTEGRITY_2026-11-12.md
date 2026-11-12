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

After that deployment, four follow-up commits (`ffe1c45`, `a0ac191`, `5deb171`, `7117dc7`) hardened subject attribution: the event writer now takes `subjectId` from the server-resolved curriculum identity rather than trusting the request payload, and regression coverage checks that boundary. These commits are on `main` but are **not deployed**: Vercel again rejected their builds with the free-plan `build-rate-limit` status. Production therefore remains on `eeeb544` until the limit resets and the newer source builds successfully.

## Additional event-pipeline findings

A production schema/data inspection found why existing event history has not been enough to drive reliable longitudinal patterns:

- The current `exam-sim` source has 75 `question_attempted` events. They carry topic IDs, but their `subjectId` values are null and they have no syllabus attribution.
- The current `learn-quiz` source has 10 `question_attempted` events without usable subject, topic, or syllabus attribution.
- The existing generic event normalizer accepts subject/topic identifiers but has no first-class syllabus field. The UI event helpers also describe normalized subject/topic labels as grouping keys, not verified syllabus identifiers.
- The live `topic_mastery` table has a nullable `syllabus_id`, but its unique key is still `(user_id, subject, topic)`. The generic `projectLearningEvent` projection also reads and upserts by user, subject, and topic without scoping by syllabus.

This means simply routing the new events through the generic mastery projector would risk merging two syllabuses into one topic row. The new verified-practice writer therefore persists the syllabus-scoped event directly through the authenticated canonical RPC and leaves the existing mastery projection untouched. This is deliberate, not an incomplete fallback.

## Remaining follow-up

- Attach verified syllabus IDs to the existing exam-simulation and Learn-quiz event writers so their historical evidence can safely participate in syllabus-scoped memory.
- Add a live authenticated practice attempt and verify the event appears in the learner's next Cortex context exactly once after a retry.
- Add rubric-aware grading for free-response answers before assigning partial or incorrect scores.
- Run the full `npm run verify` suite and capture a successful CI result.


## Follow-up: offline event acknowledgement and projection retry

A delivery audit found that the browser outbox treated every HTTP 2xx response as fully complete. The canonical event API can return HTTP 202 when the event is durably persisted but the rebuildable `topic_mastery` projection failed. Treating that response as complete removed the event from the local outbox, so the projection might never be retried.

Implemented directly on main:

- Added `isLearningEventDeliveryComplete()`. It only acknowledges a response when the server confirms `persisted: true` and does not report `projectionPending: true`.
- The browser event sender now parses the response body and retains projection-pending events in the owner-scoped local outbox.
- An event that receives a pending response schedules one delayed retry while online. If the retry still fails, it remains queued for the next app startup or online sync. This avoids an unbounded retry loop.
- The retry reuses the original source and source-event ID, so canonical event insertion remains idempotent. The server can retry the projection without creating a second source event.
- Added regression tests for pending projection, completed persistence, and incomplete success responses.

Commits:
- `aa55f49598b5ac08aa923e8085c968f87c926516`
- `78f6ddd028128bfee76a247f6ad99b2cc6c1cb59`
- `cbf56cc6291cafcc1613f477a84f83ff1e797f69`
- `d9965062c292a3c170e44421db78db730d19368d`

Verification: GitHub Actions CI was queued for the latest commit at the time of this update. No local Vitest run, browser offline/online replay test, or live database projection-failure simulation has been performed. The Vercel status remains a build-rate-limit failure and is not evidence of a TypeScript or application-build failure.


## Follow-up: atomic canonical mastery projection

A deeper concurrency audit found a second, more fundamental issue in the generic learning projector. It used a client-side read/modify/upsert sequence after inserting a projection marker. Two different learning events for the same learner/topic could read the same previous mastery and then overwrite one another. The marker prevented replay of the same event, but it did not prevent lost updates between distinct events.

Implemented directly on `main` and applied to the connected Supabase project:

- Added `public.canonical_learning_projection_ledger`, keyed by `(user_id,event_id)`, with RLS enabled and access restricted to `service_role`.
- Added `project_canonical_learning_observation(...)`, a database function that validates evidence, obtains a transaction-scoped advisory lock for the learner/subject/topic, inserts the idempotency ledger row, reads the latest topic state under row lock, and updates the mastery state in the same transaction.
- Moved the generic canonical projector from client-side read/modify/upsert to this atomic RPC. The shared 70/30 mastery transition and supporting state updates are retained.
- The RPC is not executable by `anon` or `authenticated`; only `service_role` can call it.
- The migration backfills any existing marker-based projections into the new ledger before switching the application path. The live backfill found zero existing markers, so no historical markers needed migration.
- Added a database regression script covering first projection, duplicate replay, and a second distinct observation.
- Aligned the repository migration filename to the version actually recorded by the connected database: `20261112190256_atomic_canonical_learning_projection.sql`.

Commits:
- `191e362a03ebd8fb61e33dced0d6a59d90ea9e0f` — application uses atomic projection RPC.
- `9db56fddbb9ce25e46f94eff785e06bc7cbc99b6` — migration file.
- `54f9ae654ca24303ce266e83ce3cbf585a78a878` — migration backfill protection.
- `b267093704f1669613853b0fde74e5bf509088ec` and `af0642611d0179d3bc22c38b804f4f401d2e9f45` — align migration filename to applied version.
- `02f020d2db12e3bd03d9fc14c299cc368109c1bb` — database regression test.

Live verification against the connected Supabase project:
- The migration is recorded as `20261112190256 / atomic_canonical_learning_projection`.
- A transaction-scoped regression verified first application, duplicate suppression, and a second distinct observation producing attempts=2, exposure=2, mastery=72; the test writes were rolled back.
- Two distinct observations were then submitted through separate concurrent SQL calls for the same learner/topic. The resulting row showed attempts=2, exposure=2, mastery=62 (80 followed by 20 under the 70/30 transition), proving both updates were retained rather than one overwriting the other. The temporary test row and ledger entries were deleted afterward.
- Function privilege checks confirmed service_role can execute and anon/authenticated cannot.
- Security Advisor returned the same unrelated pre-existing findings recorded earlier; no new warning was reported for the projection ledger/function.

Still unverified: a full authenticated browser event replay through the Next.js route, TypeScript/Vitest CI completion, and offline/online device replay. The Vercel status continues to report a build-rate-limit failure, not a source compilation result.
