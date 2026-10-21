# Database-backed exam-year version resolution

## Status

This is the next integration boundary for the pure resolver. The adapter is
implemented in `src/lib/curriculum/database-version-resolver.ts`. It accepts
version rows with their joined source-document and coverage-check evidence; it
does not query Supabase or change student-facing routes by itself.

## Required caller behavior

1. Query all versions for the exact board, qualification, and subject, not only
   rows whose status is already `verified`. Filtering to verified rows first
   would hide overlapping or draft records that should cause a fail-closed result.
2. Join each `curriculum_versions` row to its `curriculum_documents` record
   and all `curriculum_coverage_checks` rows.
3. Pass an explicit exam year. Do not use the current calendar year or infer
   exam year from the learner's age, grade, exam session label, or newest row.
4. The effective dates must be exact full-calendar-year boundaries before the
   adapter will map them to inclusive exam-year bounds.
5. A candidate is trusted only if its version status is `verified`, the source
   has a URL, document hash, positive page count and positive extracted-content
   character count, its extraction status is `verified` or `manual`, and all
   25 syllabus dimensions are `verified` or `not_applicable`.
6. Exam-history dimensions (past papers, mark schemes, examiner reports, grade
   thresholds) remain separate. Passing the syllabus gate does not authorize
   exam-history claims.
7. If no version matches, a matching version is incomplete, or ranges overlap,
   do not serve syllabus-specific claims. Return a clear selection/review state.

## Current live-data implications

The 2026-10-21 read-only audit showed that all sampled source documents reported
zero extracted-content characters, some versions had no syllabus coverage
checks, and one version was marked verified while extraction was partial.
Therefore those records intentionally fail the new adapter until their
provenance/coverage discrepancy is reconciled. This is not a bulk database
update and must not silently relabel existing packs.

## Scope

This adapter is pure and does not write to production. Route-aware matching
remains unavailable until the database has an explicit route identity. A future
integration must either add a trustworthy route field or use only route-less
versions, never guess a route.
