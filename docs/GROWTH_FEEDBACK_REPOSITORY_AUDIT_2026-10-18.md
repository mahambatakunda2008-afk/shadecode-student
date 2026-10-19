# Shadecode Student Feedback Loop: Repository Audit

**Initial audit date:** 2026-10-18  
**Database verification:** 2026-10-19  
**Scope:** Source inspection plus a read-only inspection of the connected production Supabase schema and policies. This is not a full security review.

## Executive finding

**Feedback functionality already exists. Do not build a second feedback system.**

The repository contains a floating FeedbackWidget in the authenticated app shell, a dedicated /feedback page, a Supabase feedback table used by both forms, an admin feedback page/API, a rate-limited email notification route, and a traction event emitted by both forms after the reliability fix. The existing production Supabase project was inspected read-only on 2026-10-19; policy definitions are verified, but end-to-end client behavior has not been tested.

## Evidence inspected

| Area | Source | Observed behavior |
|---|---|---|
| Global entry point | src/components/FeedbackWidget.tsx | Floating form; bug/feature/general; 500-character limit |
| Widget mounting | src/app/(app)/layout.tsx | Imports widget in authenticated app shell |
| Dedicated form | src/app/(app)/feedback/page.tsx | Writes to feedback table and emits feedback_submitted |
| Admin inbox | src/app/(app)/admin/feedback/page.tsx | Lists, filters, searches and exports feedback |
| Admin API | src/app/api/admin/feedback/route.ts | Authenticates user, checks admin role, then reads via service client |
| Email notification | src/app/api/feedback-email/route.ts | Validates type/message, rate-limits and sends through Resend |
| Event contract | docs/architecture/canonical-learning-events.md | Establishes canonical learning-event pathway |

## Current strengths

1. Feedback is available from the authenticated app without hunting through settings.
2. Message length is bounded and categories are simple.
3. The widget confirms a successful database insert.
4. The admin API checks authentication and role server-side before returning records.
5. Email notifications have input validation and rate limiting.
6. The dedicated page emits a feedback_submitted traction event.
7. Free-text feedback is separate from the canonical mastery/event system, which is appropriate.

## Gaps and risks to verify

### P0: inconsistent user-visible failure handling
In FeedbackWidget.tsx, a Supabase insert error is logged and the handler returns without showing an error state. The student may not know the report failed. The dedicated /feedback page does show a retry message. The two forms also have slightly different submission/notification behavior.

**Action:** unify submission behavior or share a tested helper; show clear success/failure states; ensure email-notification failure does not misrepresent whether the database insert succeeded.

### P1: feedback persistence bypasses server-side rate limiting

Both client forms insert directly into `public.feedback` through the browser Supabase client. The `/api/feedback-email` endpoint has a rate limit, but that limit protects email delivery only; direct database inserts do not pass through it. The database also intentionally allows inserts with a null `user_id`, so an unauthenticated caller can submit rows directly using the public Data API key. RLS limits the identity value on inserts but does not limit request volume.

The current `RateLimiter` implementation stores counters in an in-memory `Map` per server process. It is not a shared/global limiter across serverless instances, so it should not be treated as a strong abuse-control boundary.

**Action:** move persistence behind a validated server endpoint or add another verified abuse-control mechanism before inviting a larger cohort. Derive signed-in identity server-side, retain ownership checks, rate-limit both authenticated and anonymous traffic, keep notification best-effort, and add tests for rate limits and unauthorized identity claims. Do not silently trust client-supplied `user_id` or remove the anonymous path without deciding the intended product behavior.

### P1: duplicate surfaces and inconsistent telemetry
The floating widget and dedicated page implement similar forms separately. The reviewed source emits feedback_submitted from the dedicated page, but not from the widget. The widget caps text at 500 characters while the email API accepts up to 5,000 characters.

**Action:** define one submission contract and consistent validation across client, server and database. Instrument both entry points without sending free-text message contents to analytics.

### P1: admin inbox is not yet a full triage workflow
The admin page supports search, filters and export. The inspected item model contains identity, type, message and timestamp; the page does not expose triage status, ownership, resolution notes or a close/reopen lifecycle.

**Action:** inspect the actual table schema and RLS before deciding whether a minimal triage migration is needed. Reuse any existing status field if available.

### P1: contextual learning feedback is not established
The inspected forms capture generic bug/feature/general messages. The reviewed UI does not show a contextual “Did this help you understand?” prompt tied to a completed learning session. This source-level audit does not prove that equivalent functionality is absent elsewhere.

**Action:** search the full application before adding anything. If absent, pilot one optional, low-frequency question in one meaningful workflow.

### P1: email identity is a client-supplied hint
The email route explicitly treats userId as client-supplied and unverified. The dedicated page sends type/message without userId, while the widget sends it. Email notification is a separate request after database persistence and can fail independently.

**Action:** never treat the email's displayed user ID as authoritative. If identity is required, derive it server-side. Treat the database feedback record as authoritative.

### P2: outcomes and feedback quality are not measured
The inspected forms use generic categories. The reviewed surfaces do not show resolution rate, recurring issue summaries, response time or links from reports to fixes.

**Action:** first fix reliability and submission gaps, then introduce a small triage routine and basic operational metrics.

## Security and database checks still required

This audit did not inspect the complete table-creation history or verify deployed policies. Before schema changes, verify:
- Exact feedback columns, constraints and indexes.
- RLS is enabled and permits only intended inserts/reads.
- Students cannot read other students' feedback.
- The admin service-role route is reachable only after the server-side admin check.
- Service-role credentials remain server-side.
- [ ] Move feedback persistence behind server-side validation/rate limiting or implement another verified abuse-control boundary; current client-side inserts bypass the email endpoint's rate limit.
- Rendering/export does not expose data or create injection risks.
- Retention and deletion behavior for free-text reports is defined.

## Production database verification (read-only, 2026-10-19)

The connected active project `shadecode-student` was inspected directly. No database writes or schema changes were made.

- `public.feedback` exists and currently contains 8 rows.
- Columns observed: `id` (UUID primary key), `user_id` (nullable UUID referencing `auth.users`), `type` (nullable text), `message` (nullable text), and `created_at` (timestamptz).
- Row-level security is enabled.
- Insert policy `feedback insert own or anonymous` allows `user_id IS NULL` or `user_id = auth.uid()`.
- Select policy `feedback read own` is limited to authenticated users whose `user_id = auth.uid()`. There is no public/anonymous SELECT policy, so the RLS policy set does not grant anonymous users access to feedback rows.
- No UPDATE or DELETE RLS policies were observed.
- The admin API uses the server-side authenticated user plus `hasUserRole(user.id, "admin")` check before reading with the service-role client.
- Table-level grants include more operations than the application needs for `anon` and `authenticated`; RLS currently provides the row-level barrier. Consider least-privilege grants in a reviewed migration, after validating all intended code paths.
- The remote migration history contains `20260816175542 add_traction_feedback_experiments_exports`, but no corresponding feedback-named migration file was found in the current repository tree. This is a migration-history/repository drift signal, not proof that the table itself is absent from migration history. Reconcile before adding triage columns or policies.
- Supabase security advisors also reported unrelated findings for `challenge_answer_keys`, two SECURITY DEFINER RPCs (`apply_lesson_vote`, `publish_lesson_to_library`) and leaked-password protection. These were not changed as part of this feedback task and should be triaged separately.

**Boundary:** This verifies the observed remote schema and policy definitions at the time of inspection. It does not replace a live authenticated/anonymous authorization test, and it does not prove every deployed environment matches this project. The current feedback persistence path also bypasses server-side rate limiting, as noted above.

## Recommended implementation order

1. Verify the existing feedback schema and RLS. Do not create a replacement table.
2. Fix visible failure states in the floating widget.
3. Unify validation, submission and notification semantics.
4. Add submission telemetry for both entry points without recording message text.
5. Improve triage only after inspecting the existing schema.
6. Search for contextual session feedback; add one optional prompt only if the gap is confirmed.
7. Run a voluntary student pilot and measure activation, repeat use, issue recurrence and user-reported value.
8. Invite honest public reviews only after students have enough experience to form an independent opinion.

## Acceptance criteria

- [x] Both feedback entry points show a visible persistence-failure state.
- [x] Email notification is best-effort and does not block success after database persistence.
- [ ] Both forms use the same validated message/category contract.
- [x] Telemetry covers both forms without collecting message content.
- [x] Production feedback schema and deployed RLS policy definitions were inspected read-only; live authorization tests and migration-history reconciliation remain open.
- [ ] Students cannot read other students' feedback.
- [ ] Admin authorization is enforced server-side.
- [ ] Tests cover endpoint validation and notification failure; widget/database persistence-failure tests and live authorization tests remain open.
- [ ] No duplicate feedback table or competing analytics source is introduced.

## Audit limitation

The source audit began on 2026-10-18; read-only production schema/policy inspection occurred on 2026-10-19. Runtime submission behavior, live authorization attempts and migration-history reconciliation remain unverified. Search for equivalent implementations before adding new functionality.
