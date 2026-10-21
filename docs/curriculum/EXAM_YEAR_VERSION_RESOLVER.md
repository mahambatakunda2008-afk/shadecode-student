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


## Live schema audit (read-only, 2026-10-21)

The production schema was inspected without writing data. The current tables do
not yet map one-to-one onto the pure resolver candidate type:

- `curriculum_versions` stores `board_id`, nullable `qualification_id`,
  `syllabus_id`, `syllabus_version`, nullable `subject_id`, nullable
  `effective_from` / `effective_to` dates, `status`, `source_document_id`,
  `document_hash`, and provenance. It has no explicit `route_id`,
  `exam_year_start`, `exam_year_end`, `complete`, or `verified` columns.
- `curriculum_coverage_checks` links by `curriculum_version_id` and stores
  dimension, status, evidence, notes, and checked timestamp. These checks must
  participate in a documented completeness policy, not be reduced to a raw row
  count.
- `curriculum_documents` has extraction status, page count, content character
  count, extracted text, hash, and structure. A version must not be treated as
  complete just because its version row says a favorable status.
- `profiles.curriculum_subjects` stores exact learner identities including
  `syllabusVersion`, but it is user context, not authority, and does not supply
  a trustworthy exam year by itself.

### Integration blockers

1. Define and test how inclusive exam-year bounds are derived from official
   effective dates. Do not infer an exam year from the current calendar year.
2. Resolve the route model before adding route selection to database-backed
   calls. Until then, do not pretend the current schema distinguishes routes.
3. Define the authoritative status-to-`verified` mapping and required coverage
   dimensions, with extraction evidence and version-specific tests.
4. Reject records with missing qualification/subject/effective dates where the
   requested identity depends on those fields; never fill them from a guess.
5. Keep this change read-only: no production schema or row changes were made.
