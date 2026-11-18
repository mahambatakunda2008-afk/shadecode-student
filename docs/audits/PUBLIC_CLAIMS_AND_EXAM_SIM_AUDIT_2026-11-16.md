# Public claims and Exam Simulation audit — 16 November 2026

## Scope and evidence

Reviewed the production `main` source at commit `41b892867d643afb30184313b0c61095956d39f8`:

- `src/app/(public)/page.tsx`
- `src/app/(app)/exam-sim/ExamSimulationClient.tsx`
- `src/components/exam/ExamWorkspace.tsx`
- `src/components/exam/ExamAttemptLocalBridge.tsx`
- `src/app/api/exam/generate/route.js`
- `src/app/api/exam/mark/route.js`
- `src/lib/local-first/exam-marker.ts`
- `src/lib/local-first/exam-attempt.ts`
- `e2e/exam-simulation.spec.ts`
- `.github/workflows/exam-browser.yml`
- `docs/architecture/offline-acceptance-matrix.md`
- `docs/curriculum/coverage-evidence-policy.md`

This is a source audit, not an authenticated browser test or real-device test.

## Public homepage findings

The current source has already moved away from the legacy marketing claims observed in an older public-page crawl. The current source:

- Does not state a fixed "14 subjects" count.
- Does not claim universal offline operation. It says local-first/offline support is being engineered and that core learning state and selected content are being designed for offline use.
- Distinguishes the currently available Shadecode Student product from the wider Discovery / Campus product-family direction in the FAQ, but the platform cards could still be mistaken for currently released products.
- Uses "learn any topic" and "see exactly which topics to work on next" in the hero. These are broader than the source audit can substantiate for every subject/topic.

The source audit cannot establish that the production HTML currently served to every visitor matches this source. An external crawler returned an older page snapshot containing "14 Subjects", blanket offline claims, and broad AI/Cortex claims; that result was explicitly several months old and is not reliable evidence of the current live response. Production Vercel metadata reports a READY deployment from the same main commit, but deployment readiness alone does not prove which HTML a browser or crawler receives.

## Copy changes made in this branch

1. Replaced "learn any topic" with "study supported topics".
2. Replaced the absolute "see exactly which topics to work on next" with a more modest learning next-step statement.
3. Replaced the Exam Simulation feature claim that attempts, marks and mistakes become revision signals with a narrower promise to practise timed papers, review answers and identify areas for further work.
4. Made the long-term product-family section explicitly identify Shadecode Student as the product available today and Discovery/Campus as planned experiences.

These are copy-only changes. They do not alter app behavior, curriculum data, authentication, assessment or offline support.

## Exam Simulation: verified source behavior

### Paper generation

- Requires an authenticated learner.
- Resolves the requested subject against the learner's selected subjects.
- Uses the deterministic question engine or curated bank first when they cover the requested subject/topic.
- Attempts Cortex generation only when built-in coverage does not apply.
- Fails with an explicit insufficient-coverage response rather than presenting a shortened paper as complete.
- Signs generated paper provenance for later verification.

### Attempt preservation

- The client persists exam state to local storage and the local-first attempt/session stores while the attempt is active.
- Answers, current question, timer state, flags and canvas content are included in the saved snapshot.
- The local bridge scopes attempts to an authenticated user and can restore an active attempt.
- This is source-level evidence only; force-close/reopen and account-switch isolation still require browser/device acceptance testing.

### Marking and evidence boundaries

- When online, the client submits the paper and answers to `/api/exam/mark`.
- If cloud marking fails, the client falls back to local deterministic marking.
- Local marking gives exact marks for supported numeric and multiple-choice answers. Written answers without a defensible deterministic rubric are explicitly left for deeper marking/manual review rather than invented partial credit.
- The server marking route verifies paper provenance, but currently returns `evidenceRecorded: false` even when provenance is valid, with reason `trusted_provenance_evidence_pipeline_pending`. Unverified paper provenance is also feedback-only.
- The client comments explicitly state that submitted scores are not yet persisted as trusted exam history or mastery evidence.

**Showcase implication:** It is accurate to demonstrate paper generation, timed answering, feedback and the saved attempt/reopen flow if those pass acceptance tests. It is not accurate to say that every attempt automatically updates trusted mastery, XP, exam history or Cortex revision evidence. A score shown on the result screen is feedback for that attempt, not necessarily a verified long-term learner record.

## Browser acceptance setup

An existing Playwright test `e2e/exam-simulation.spec.ts` covers:
- sign-in;
- generate a 5-question paper;
- answer all five questions;
- submit for marking;
- verify the result heading and result tabs.

The test is skipped unless `E2E_EXAM_SUBJECT` is configured. The manual GitHub Actions workflow `.github/workflows/exam-browser.yml` requires the exact subject configured on the E2E account and repository secrets `E2E_EMAIL` and `E2E_PASSWORD`. No authenticated run was initiated in this audit because the connected environment does not expose those secret values or the configured E2E account's selected-subject list.

The existing E2E test does not yet prove:
- reload/force-close recovery of an in-progress exam;
- account-switch isolation;
- offline start, answer, submit and result behavior;
- whether local-only written-answer results are clearly distinguished from cloud AI marking;
- whether a submitted attempt is visible after leaving and reopening the Exam Simulation area.

## Demo recommendation

Exam Simulation is a strong candidate for the showcase because its source includes a no-AI-first paper path, local attempt persistence and deterministic marking for supported answer types. But the safest demo must use a specific, verified subject/topic with supported built-in questions, and must be rehearsed end-to-end.

Do not claim universal subject coverage, fully offline Exam Simulation, AI availability, or automatic trusted mastery updates. Prefer a short paper containing only answer types whose marking behavior is understood. If written responses are included, explicitly show the actual feedback and its limitations.

## Remaining acceptance tests

1. Run the existing authenticated Playwright test against production or an immutable preview using the dedicated E2E account.
2. Repeat generation → answer → submit → result at least three times.
3. Start a paper, answer several questions, reload the page, and verify the exact attempt resumes.
4. Close/reopen the browser and verify recovery.
5. Switch accounts and confirm no attempt from the previous user is exposed.
6. Run the built-in supported paper offline from launch through marking and inspect which answer types receive marks.
7. Confirm the UI never labels feedback-only scores as trusted mastery or verified exam history.
8. Confirm the public production homepage served to a fresh browser matches the revised source and no stale legacy claims remain.

## Status

- **Public source copy audit:** completed.
- **Copy-only qualifications:** committed to the audit branch.
- **Exam Simulation source audit:** completed with evidence limitations.
- **Authenticated browser acceptance:** not run.
- **Real-device/offline acceptance:** not run.
- **Production app behavior changed:** no.
