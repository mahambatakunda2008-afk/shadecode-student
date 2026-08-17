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
- The traction metrics RPC rejects non-admin callers and has no anonymous EXECUTE grant.
- `set_academic_contexts_updated_at()` now uses `SET search_path = public` and is not executable by `PUBLIC`.
- Cortex Engineering has source-path restrictions, protected-path restrictions, bounded generated changes, and a human review gate.

## Current Supabase advisor findings

### Informational

- `exam_logs` has RLS enabled without policies.
- `insights_archive` has RLS enabled without policies.

These tables are not being treated as student-readable by default. Policies should be added only after their intended owner/admin semantics are defined, rather than creating permissive policies just to silence the advisor.

### Warnings requiring deliberate review

- `get_traction_metrics()` is `SECURITY DEFINER` and executable by `authenticated`. It contains an admin-role guard. Its privilege should remain until the admin dashboard is migrated to a safer equivalent invocation path.
- `get_user_permissions()` is `SECURITY DEFINER` and executable by `authenticated`. It rejects unauthenticated and cross-user calls.
- `has_permission()` is `SECURITY DEFINER` and executable by `authenticated`. It rejects unauthenticated and cross-user calls.
- `has_role()` is `SECURITY DEFINER` and executable by `authenticated`. It rejects unauthenticated and cross-user calls.
- `increment_xp()` is `SECURITY DEFINER` and executable by `authenticated`. It rejects unauthenticated and cross-user end-user calls while retaining the trusted service-role path.
- `upsert_revision_item()` is `SECURITY DEFINER` and executable by `authenticated`. It rejects unauthenticated and cross-user calls.
- Supabase Auth leaked-password protection is disabled. This should be enabled in Auth security settings.

## CI verification

The repository CI performs:

1. TypeScript typecheck
2. ESLint
3. Vitest
4. Production build

The CI runtime is Node 24 because the current `pdfjs-dist` dependency requires Node >=22.13. GitHub Actions is now configured to use the Node-24-native `actions/checkout@v5` and `actions/setup-node@v5` releases.

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
