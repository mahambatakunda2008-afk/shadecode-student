# Read-only database-backed syllabus resolution

Implementation: `src/lib/curriculum/database-version-query.ts`

The query adapter reads all database versions matching the exact board,
qualification, and subject identity, then joins each version to its source
document and coverage checks before passing the rows to
`resolveDatabaseCurriculumVersion`.

## Trust rules

- Never filter to `status = verified` before resolving. Draft or incomplete
  overlapping versions must remain visible to the resolver.
- Effective dates must be full calendar-year boundaries before they can be
  interpreted as inclusive exam-year ranges.
- Source URL, page count, extracted characters, extraction status, and every
  syllabus coverage dimension are checked by the existing database resolver.
- The version-level document fingerprint must match the source document's
  content fingerprint. A missing, placeholder, malformed, or mismatched hash
  fails closed.
- The current schema does not represent curriculum routes. A routed request is
  therefore not resolved by this adapter.
- Database errors are thrown to the server caller. They are not converted into
  a false `not_found` result.

## Release boundary

This is a read-only query adapter. It does not write to Supabase, change a
record's verification status, modify existing syllabus packs, or switch any
student-facing route. Before use in a live route, add query-layer tests against
the actual schema and verify the active server client's read permissions and
RLS behavior. The existing pure resolver and database-row policy tests remain
the deterministic unit-test layer.

## Known live-data blocker

The 2026-10-21 read-only audit found that the listed curriculum documents had
zero `content_characters`, including some rows marked `verified` or
`manual`. Several versions also had placeholder or non-hex fingerprints,
missing coverage dimensions, partial extraction, or no explicit end date.
Those records must remain blocked until the source extraction and evidence are
reconciled. This adapter deliberately does not repair or promote them.
