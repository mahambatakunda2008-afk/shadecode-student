# Shadecode Student: Product-Wide Reliability and Learning-Loop Plan

**Updated:** 2026-10-19  
**Status:** Active engineering plan. This is a prioritization and acceptance document, not a claim that the listed areas have already passed.

## Product boundary

Shadecode Student is a personal academic operating system, not an exam-only app and not a Socratic-Tutor-only product. Tutor UX is one slice of the experience. A student must be able to sign in, choose a relevant learning task, get useful help, continue when connectivity or a provider is unreliable, save their work, verify understanding, and return to a trustworthy record of progress.

The engineering objective is not to add features around unreliable core workflows. It is to make the existing learning loop dependable across the app.

## Release principles

1. **Fix the full user journey, not only a component.** Trace dashboard or entry point → subject/topic selection → generation/request → useful result → save/reopen → practice/assessment → honest progress.
2. **One canonical AI route.** UI code should not call AI providers directly. Keep provider routing behind Cortex/hybrid runtime boundaries.
3. **Local-first where useful, cloud-assisted where necessary.** Preserve drafts and useful state locally; distinguish offline capability from cloud-only work; recover cleanly after network/provider failures.
4. **Never fake completion or learning.** A request being sent, a lesson being generated, or a student sending messages is not proof that the output is valid or that the student mastered a topic.
5. **Recover without duplication.** Preserve input on failure, avoid duplicate submissions, make retries explicit, and ensure loading state always ends.
6. **Validate data before writing it.** Do not silently accept malformed model output, wrong curriculum mappings, duplicate topics, or unsafe database assumptions.
7. **Small safe changes with evidence.** Typecheck, lint, focused tests, full tests, production build, preview deployment, and appropriate authenticated journeys. Do not merge or deploy production based only on a successful build.
8. **Protect production data.** Read-only audit before schema changes; verified backup and reviewed reconciliation before migration-ledger edits or historical migration replay.

## Workstreams and acceptance gates

### P0. Account access and data integrity
- Signup, login, session refresh, logout, and protected-route behavior work without confusing timing messages or retry loops.
- RLS and RPC permissions enforce the intended user boundary; client input is not treated as trusted.
- Data save failures are visible and recoverable; a local-save state is not misrepresented as a cloud save.
- Migration history is reconciled from evidence. Name mismatches are not proof of missing migrations, and historical SQL is not blindly replayed.
- Acceptance: automated auth/data-boundary tests, migration/schema review, and authenticated smoke test on a preview.

### P0. Cortex and generation reliability
- Inventory all generation consumers: lessons, tutor, Exam Sim, exam explanations/marking, Math Checker, insights, and any curriculum or question-generation path.
- Trace the complete request path through the /api/cortex endpoint and the hybrid runtime. Remove accidental direct-provider bypasses and duplicate retry loops.
- Use bounded timeouts, transient-error-aware retries, validated structured outputs, explicit cancellation where practical, and a clear distinction between retryable failure and invalid output.
- Local recovery must be a real supported lane with known capability limits, not a reassuring message that implies unavailable work succeeded.
- Preserve prompt/task context and user input through recoverable failures. Never expose raw provider exceptions or secrets.
- Instrument stage timings, provider/local route, validation failure, timeout, fallback outcome, and request correlation ID without logging sensitive student content unnecessarily.
- Acceptance: fault-injection tests for timeout, unavailable provider, malformed JSON, empty output, abort, and exhausted fallback; verify loading clears and no duplicate result is stored.

### P0. Lesson generation and curriculum correctness
- Validate subject, level, topic and curriculum context before generation; reject unknown mappings instead of inventing syllabus coverage.
- Verify output shape, explanation quality, examples, practice questions and answer consistency before showing a lesson as complete.
- Persist only validated results; preserve drafts and make retry/recovery state explicit.
- Deduplicate topic identities safely without conflating distinct syllabus topics that happen to differ in capitalization.
- Acceptance: representative Cambridge AS/A Level fixtures, malformed-output fixtures, save/reopen test, duplicate-topic regression test, and a provider-failure recovery test.

### P0. Exam Sim, Exam Hub and marking
- Verify exam setup, paper/question selection, timing, answer persistence, resume, submission, marking and review as one journey.
- Make question and mark-scheme provenance explicit. Do not invent official answers or mark schemes when unavailable.
- Handle long exams, refreshes, accidental navigation, partial completion and connectivity loss.
- Keep generated practice distinct from official past-paper material.
- Acceptance: a complete exam fixture through submission and review; timer/resume tests; partial-save and network-failure tests; marking sanity fixtures for correct, partly correct, incorrect and ambiguous responses.

### P1. Math Checker, Socratic Tutor and subject tools
- Keep the tutor student-directed, concise by default, and capable of giving a worked solution when asked.
- Math Checker must distinguish checking the student's work from solving a problem; show the reasoning and identify uncertainty rather than asserting an unsupported error.
- Computer Science tools should validate pseudocode/programming examples and avoid claiming execution when no execution happened.
- Keep subject-specific tools aligned with the selected level and verified curriculum context.
- Acceptance: representative correct/incorrect/ambiguous inputs, direct-answer request, worked solution, similar follow-up practice, and request failure/retry.

### P1. Persistence, offline mode and device continuity
- Clearly identify local-only versus server-saved state.
- Test offline reading and any supported offline practice; queue or explain unsupported actions honestly.
- Reconnect without duplicate writes or overwriting newer data with stale local state.
- Test installability and service-worker update behavior without trapping users on a stale app.
- Acceptance: offline/online transition test, reload/reopen test, duplicate-write test, and visible save-state verification.

### P1. Learning progress and dashboard integrity
- Distinguish activity, completion, assessment evidence and demonstrated understanding.
- Dashboard XP, streaks, tasks, timetable, achievements and insights must derive from canonical records with defined update rules.
- Do not award completion for failed generation or treat repeated AI interaction as evidence of mastery.
- Make empty, loading, stale and error states useful and distinguishable.
- Acceptance: event-to-dashboard tests for success, retry, duplicate event, failed task and new account.

### P1. UX consistency, accessibility and performance
- Audit navigation and primary workflows across dashboard, Learn, Exam Sim, Exam Hub, Math Checker, Focus, Timetable, Code Lab and settings.
- Use consistent icons, labels, focus states, touch targets, loading patterns and inline error recovery. Avoid visual polish that hides unfinished behavior.
- Check narrow mobile viewports, keyboard-only navigation, visible focus, screen-reader labels, contrast, and reduced motion.
- Measure time to useful result, not just API latency. Avoid hard latency guarantees until measured and enforced.
- Acceptance: route-by-route smoke checklist and focused accessibility checks on critical journeys.

### P2. Growth and real-world usefulness
- Prioritize real student jobs over feature count: find a relevant topic, understand it, practise it, verify it, and resume later.
- Make onboarding lead to a real first success; avoid unsupported claims about grades, syllabus coverage or AI accuracy.
- Instrument privacy-conscious activation and retention signals, then conduct small formative usability sessions. Do not treat five interviews as market validation.
- Acceptance: a student can complete the first useful task without coaching, and the team can identify where users abandon without collecting unnecessary personal data.

## Implementation order

1. Confirm current baseline and checks on the latest commit.
2. Resolve the highest-risk account/data integrity issues and inspect the open production migration-drift reconciliation issue before any schema-affecting rollout.
3. Trace Cortex generation paths and add fault-injection coverage.
4. Fix lesson generation end-to-end, including validated output and persistence.
5. Fix Exam Sim / Exam Hub end-to-end.
6. Verify Math Checker and tutor behaviors against the same reliability contracts.
7. Verify local persistence/offline transitions and dashboard event integrity.
8. Complete responsive/accessibility checks and growth instrumentation.

This order may change if production telemetry or a reproducible blocker shows a more urgent failure. Do not start risky schema changes merely because they appear on this list.

## Current status as of 2026-10-19

- PR #388 now covers shared student-agency and learning-evidence contracts across Learn, Socratic Tutor, Cortex Verify/Math Checker, Exam Sim post-marking review, and Exam Hub Question Bank/Past Papers.
- Shared help actions and evidence-trace components are in place on the feature branch. A syntax error in an intermediate Question Bank commit was identified from the preview build and corrected; the latest exact-head CI and preview must be checked before calling this validated.
- The earlier tutor-only baseline passed CI, but it does not validate the expanded shared-component integrations.
- Authenticated end-to-end and real-device accessibility checks remain unverified. Keep PR #388 open until these are completed.
- The next engineering passes still need to focus on Cortex generation reliability, end-to-end lesson persistence, Exam Sim submission/review, authentication/data integrity, offline persistence, and dashboard correctness.
- Open issue #391 tracks production Supabase migration-history drift. Treat its counts as audit signals, not proof of missing migrations. No blind replay or ledger edits.
- Production deployment has not been changed by this plan.

## Definition of done for a core workflow

A workflow is not done merely because it renders or returns HTTP 200. It must demonstrate:
- valid inputs and a clearly selected task;
- a useful, schema-valid result or an honest actionable error;
- preserved student work on recoverable failure;
- no duplicate submission or persistence;
- accurate saved/local state;
- correct curriculum/task context;
- an observable completion state that does not overclaim learning;
- tests for success, failure, retry and boundary cases;
- preview validation and a documented release decision.
