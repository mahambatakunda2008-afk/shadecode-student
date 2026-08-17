# Shadecode Student Security Audit Baseline

Status: **baseline verified; continuous audit required**

## Verified controls

- Protected application routes require an authenticated Supabase user.
- Onboarding completion is read from `user_profiles`, not a browser-controlled authorization cookie.
- Admin flows use authenticated role/permission checks.
- Cortex student requests are bound to the authenticated user identity.
- Cortex draft approval requires the explicit `approve_drafts` permission.
- The legacy browser-supplied static `x-admin-token` mechanism is not present in the repository search surface.
- Generic offline mutations are allowlisted to user-scoped tables.
- Offline synchronization verifies the authenticated owner before writes.
- Update/delete synchronization adds the authenticated `user_id` constraint.
- Supabase RLS is enabled on the audited user-owned tables.
- Service-role credentials are not referenced in the application source search surface.
- The traction-metrics RPC was restricted from anonymous execution.
- Academic-context trigger functions use an explicit `search_path`.

## Required continuous checks

Security is not considered permanently complete. Every new API route, storage bucket, RPC, offline store, AI provider integration and admin capability must be reviewed for:

1. authentication;
2. authorization and RLS;
3. tenant/user isolation;
4. input validation;
5. rate limiting and abuse controls;
6. secret exposure;
7. file upload and storage policy;
8. prompt-injection and untrusted-content boundaries;
9. logging/privacy implications;
10. academic-integrity implications.

## Academic integrity

Student assistance should distinguish tutoring, hints, worked examples and assessment submission. Exam or restricted-assessment flows must not silently turn the system into an answer-submission engine.

## Privacy boundary

Student learning data is private by default. Institution, teacher and parent views must be explicitly permissioned and should expose only the minimum data needed for their legitimate function.

## Limitations

This document records the controls verified in the repository/database audit. It is not a penetration test, formal compliance certification, or guarantee against undiscovered vulnerabilities.
