# Shadecode Student Feedback Loop: Repository Audit

**Audit date:** 2026-10-18  
**Scope:** Initial source inspection for the Growth, Feedback & Reputation Plan. This is a source-level audit, not a production test or full security review.

## Executive finding

**Feedback functionality already exists. Do not build a second feedback system.**

The repository contains a floating FeedbackWidget in the authenticated app shell, a dedicated /feedback page, a Supabase feedback table used by both forms, an admin feedback page/API, a rate-limited email notification route, and a traction event emitted by the dedicated page. The next step is to harden and unify this existing loop. Production behavior and deployed database policies have not been verified.

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
- Rate limiting protects persistence as well as email delivery where appropriate.
- Rendering/export does not expose data or create injection risks.
- Retention and deletion behavior for free-text reports is defined.

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

- [ ] Both feedback entry points show clear success/failure states.
- [ ] Email failure does not misrepresent database persistence.
- [ ] Both forms use the same validated message/category contract.
- [ ] Telemetry covers both forms without collecting message content.
- [ ] Schema and deployed RLS are verified before migration.
- [ ] Students cannot read other students' feedback.
- [ ] Admin authorization is enforced server-side.
- [ ] Tests cover validation, persistence failure and notification failure.
- [ ] No duplicate feedback table or competing analytics source is introduced.

## Audit limitation

This reflects files inspected on main on 2026-10-18. It does not claim production has been tested, database policies are correct, or equivalent functionality is absent elsewhere. Verify runtime behavior and search for equivalent implementations before coding.
