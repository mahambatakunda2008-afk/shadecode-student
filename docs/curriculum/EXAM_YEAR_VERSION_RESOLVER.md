# Exam-year-aware curriculum version resolution

## Goal

Keep existing syllabus editions and future editions side by side. Select the
correct edition using the exact board, qualification, subject, optional route,
and requested exam year. A student preparing for a 2026 exam must not silently
receive a 2028-2030 syllabus simply because it is newer.

## Resolver contract

Implementation: `src/lib/curriculum/version-resolver.ts`

- Exam-year ranges are inclusive.
- Board, qualification, subject, and route identifiers must match exactly after
  trimming and case normalization.
- Route-less requests match only route-less packs. Routed requests match only
  that route. There is no route fallback.
- No match returns `not_found`; no nearest-year or latest-version fallback is
  permitted.
- Overlapping matches return `ambiguous`; callers must resolve the data
  conflict before serving syllabus-bound learning.
- A matching pack is selectable only when both `complete` and `verified`
  are explicitly true.
- Incomplete or unverified matching metadata returns `not_verified`, not a
  student-facing version.
- Invalid identity/year inputs return `invalid_request`.

## Non-goals and rollout guardrails

This pure helper does not read or write Supabase, promote source records, ingest
syllabus PDFs, or replace existing curriculum resolution in application flows.
It is the deterministic selection primitive for a later integration. Before
wiring it into student-facing routes, map real database records into the
candidate type and add integration tests for the existing schema and route
semantics. Keep all older packs immutable; add new version records rather than
updating an older pack in place.

## Required follow-up

1. Audit the database's board, qualification, subject, route, and exam-year
   fields and document their exact mappings.
2. Add integration tests against representative old and new versions, including
   the 2025-2027 and 2028-2030 Cambridge editions.
3. Integrate the resolver only where callers have a reliable exam year and
   exact curriculum identity. If the year is missing, ask the learner to select
   it rather than guessing.
4. Keep incomplete/unverified packs available only for internal review, not as
   authoritative exam-required content.
