# Shadecode Student Security Audit

Date: 2026-08-17
Status: **P0 controls reviewed; continuous audit remains required**

## Verified controls

- Supabase Row Level Security is enabled on the audited student-owned tables.
- `user_profiles` reads are owner-scoped.
- `academic_contexts` is owner-scoped.
- Offline mutations carry an authenticated owner id and are allowlisted by entity.
- Offline sync never treats local state as an authorization source.
- Onboarding authorization uses the server-side `user_profiles.onboarding_completed` value rather than a browser-controlled completion cookie.
- Admin access is checked through the application role system.
- Cortex draft approval requires the authenticated draft-approval permission.
- Cortex student intelligence requests are bound to the authenticated user.
- The traction metrics RPC no longer permits anonymous execution.
- Cortex Engineering has source-path restrictions, protected-path restrictions, bounded generated changes, and a human review gate.

## CI verification

The repository CI performs:

1. TypeScript typecheck
2. ESLint
3. Vitest
4. Production build

The CI runtime is Node 24 because the current `pdfjs-dist` dependency requires Node >=22.13.

## Remaining continuous checks

These are deliberately retained as recurring audit work rather than declared permanently solved:

- API route authorization coverage
- File-upload size/type/content validation
- Rate limiting and abuse controls
- AI provider prompt-injection and data-boundary review
- Storage policy review as new buckets are introduced
- Secret scanning and dependency review
- Academic-integrity controls for assignments/exams
- Privacy review as teacher/parent/institution features are added

## Audit principle

A passing typecheck or lint run is not evidence of authorization correctness. Every new API, RPC, storage bucket, offline mutation, and privileged workflow must be reviewed at its actual trust boundary.
