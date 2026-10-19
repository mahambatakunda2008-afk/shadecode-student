# Learn save boundary: post-save side effects

Date: 2026-10-19

## Finding

Code review of `POST /api/learn` found two different post-save behaviors:

- The resumable `persist` path already treated learner-memory writes and XP awards as best-effort after the lesson was durably finalized.
- The non-resumable complete-lesson path awaited those same operations directly. If either rejected after the lesson row had been saved, control could reach the route-level error handler and report a failed generation even though the lesson existed.

That violates the product contract: secondary analytics/progression services must not turn a successfully saved lesson into a learner-visible generation failure.

## Change

The complete-lesson path now uses `Promise.allSettled` for the post-save learner-memory and XP operations. Rejections are logged as warnings while the successful lesson response is still returned. The lesson save itself remains a hard requirement and still returns an error if persistence fails.

## Acceptance

- Typecheck, lint, tests, and build pass on the exact PR head.
- The response remains successful when either post-save side effect rejects.
- A failed lesson insert/update still returns an error and is not reported as saved.
- No schema or production data changes are involved.
