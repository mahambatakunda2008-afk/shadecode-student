# Security Audit — 2026-08-16

## Verified findings

- All audited public tables have RLS enabled.
- `user_profiles` uses owner-scoped policies based on `auth.uid() = user_id`.
- `academic_contexts` uses owner-scoped policies based on `auth.uid() = user_id`.
- `exam_logs` and `insights_archive` have RLS enabled but no client policies; this keeps them inaccessible through normal client roles and should remain intentional/server-only unless a documented consumer requires access.
- Security-definer role/permission helpers are restricted to authenticated/service roles and enforce identity checks.
- `increment_xp` is no longer executable by `anon`.
- `get_traction_metrics` was found still executable by `anon`; its implementation itself checks for an admin role, but anonymous execution was unnecessary and has now been revoked in the live database and migration history.

## Remaining audit surface

- Continue API-route authorization review.
- Review service-role usage and ensure it never reaches client bundles.
- Review file upload/storage policies.
- Review rate limits and abuse controls.
- Review AI-provider request boundaries and prompt-injection defenses.
- Review academic-integrity controls around assignments/exams.

## Principle

A `SECURITY DEFINER` function should have the narrowest possible execute grants. Authorization inside the function is useful defense-in-depth, but it is not a reason to grant anonymous callers an admin-oriented RPC.
