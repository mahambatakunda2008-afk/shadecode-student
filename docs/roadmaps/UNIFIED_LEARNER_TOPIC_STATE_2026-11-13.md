# Unified learner topic state

Date: 2026-11-13

## Goal

Expose one deterministic, evidence-backed topic state in Cortex context without creating a competing mastery store. The existing `topic_mastery` projection remains the numeric source of record. This layer interprets that evidence for product surfaces.

## Contract

Each topic now includes:

- `mastery`: `unobserved`, `developing`, `struggling`, or `demonstrated`.
- `trajectory`: `unknown`, `improving`, `steady`, or `declining`.
- `evidenceStrength`: `none`, `limited`, `moderate`, or `strong`.
- Evidence count, confidence derived from the existing uncertainty field, and plain-language rationale.

The deterministic thresholds are explicit heuristics, not a psychometric diagnosis:
- No scored attempts or no measured mastery => unobserved.
- Demonstrated requires at least three attempts, mastery >= 80, and (when available) error rate < 30.
- Struggling requires at least two attempts plus mastery < 50 or error rate >= 60.
- Other measured evidence => developing.
- Trajectory requires at least two attempts and a recent-improvement signal. +/-3 points defines improving/declining; otherwise steady.

The engine does not infer forgetting from elapsed time. Existing spaced-retrieval evidence remains descriptive only. A future forgetting-risk label needs validated evidence and calibration.

## Syllabus isolation

`GET /api/cortex/student-context` now resolves the authenticated learner's curriculum identity. It accepts an optional `subjectId` query parameter when multiple curriculum subjects are configured. A resolved syllabus ID scopes both topic evidence and learning-event history. When no verified syllabus identity is available, the resolver only returns legacy rows with a null `syllabus_id`; it does not blend rows from different syllabuses.

Bearer-token clients use the same bearer identity for both authentication and curriculum reads. Cookie-session clients continue to use the server session.

The live `topic_mastery` schema was inspected and made syllabus-aware in the canonical projector. Its uniqueness now partitions by `(user_id, subject, topic, coalesce(syllabus_id, ''))`. Canonical event ingress resolves the learner's verified syllabus server-side and maps topic labels to a stable `curriculum_knowledge.knowledge_key` only on one exact verified match. That key is written to the existing `topic_mastery.curriculum_topic_key` field. Unmatched and ambiguous labels remain syllabus-scoped display topics without a guessed curriculum key.

## Changes committed directly to main

- `557dc82423f9d564815734347f6624bb7a5afe52` add pure learner topic state resolver.
- `90ca4ac8dff712b81e17a04b2527c365b87f3ce2` add state regression tests.
- `32ce22080980fff01e4a47fab385221c22489bb1` expose learner state in Cortex student context.
- `76a777303a962dafe4a9c2b85cd417f642d57e06` partition topic evidence by syllabus.
- `8eacfa4f8f13b3a8b40ca806b12daec6b6141f11` resolve verified curriculum identity in student-context API.
- `c11b5c621d26a8fd57f2b757507a222941d1956f` support bearer-authenticated curriculum resolution.
- `0d12a518b5179cb762cd236feb17df68d6623027` keep bearer and cookie learner identity aligned.
- `b84375828ab00c4961b455088926cd4308397413` retain syllabus identity when curriculum content coverage is gated.
- `edd96581ae575e240e82ea026401762486bda957` ensure the topic query actually applies the syllabus partition.

## Verification

- Read the live `topic_mastery` column and index definitions from the connected Supabase project. No database migration was needed.
- Reviewed current Supabase RLS guidance and the November 2026 Supabase JS changelog. No relevant breaking change affects the read-only authenticated queries used here.
- Added Vitest coverage for unobserved topics, demonstrated thresholds, repeated struggling evidence, and insufficient trajectory evidence.
- Tests, TypeScript, lint, deployment, and end-to-end authenticated context retrieval have not yet been run for these commits. A passing build is not claimed.

## Next

1. Extend the same shared evidence contract to lesson-view/completion and activity interactions where meaningful assessment evidence exists; avoid treating passive views as mastery.
2. Add shared typed consumers in Learn, Exam Sim, practical work, Math Checker, and recommendation surfaces without double-counting existing evidence.
3. Add validated spaced retrieval and forgetting-risk calibration only after enough longitudinal evidence exists.


## Verified topic mapping update (2026-11-13)

Completed the first verified topic-mapping slice. New module `src/lib/curriculum/topic-mapping.ts` accepts only a resolved curriculum and exact, unique matches against verified topic knowledge records. The authenticated event route and server-side event bridge both attach the canonical knowledge key. `projectLearningEvent` passes that key into the atomic syllabus-aware projection RPC. Tests cover exact match, non-fuzzy rejection, duplicate-label ambiguity, and unverified curriculum. The mapping and its boundaries are documented in `docs/roadmaps/VERIFIED_SYLLABUS_TOPIC_MAPPING_2026-11-13.md`.


Native exam completion now carries the same verified curriculum topic key through its durable outbox into the exam mastery projection. Migration 20261113141351 adds an optional key argument to the service-role-only projector; old outbox records remain compatible. Its SQL regression test passed in a transaction/rollback against the connected project.


## Learn quiz integration update (2026-11-13)

Lesson quiz completion now updates two complementary records atomically: the existing idempotent curriculum objective assessment progress and the syllabus-aware `topic_mastery` projection. The completion function resolves only the lesson's attached verified curriculum version and requires exactly one verified topic knowledge match. It writes a canonical quiz event with explicit score/correctness evidence and projects using the stable quiz attempt ID. A retry of the same completed attempt returns the stored result and cannot count the evidence twice. Unmatched or ambiguous topics remain unprojected rather than guessed. Migration `20261113142018_unify_lesson_quiz_topic_mastery` is applied; a SQL structural regression test passed in a transaction/rollback. Full authenticated quiz submission replay and app build remain unverified.
