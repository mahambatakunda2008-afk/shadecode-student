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

The live `topic_mastery` schema was inspected. It has nullable `syllabus_id` and `curriculum_topic_key`, but its unique key remains `(user_id, subject, topic)`. The generic atomic event projector still identifies rows by user/subject/topic and does not accept syllabus identity. Therefore this change deliberately does not claim that generic unscoped events are syllabus-safe. The syllabus-specific producers and projector contract still need to be completed before those events can populate a per-syllabus mastery row reliably.

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

1. Complete verified topic/objective mapping so event labels can be linked to stable syllabus topic keys, not just syllabus IDs.
2. Add shared typed consumers in Learn, Exam Sim, practical work, Math Checker, and recommendation surfaces.
3. Add validated spaced retrieval and forgetting-risk calibration only after enough longitudinal evidence exists.
