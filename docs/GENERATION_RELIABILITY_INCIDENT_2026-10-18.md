# Generation Reliability Incident and Recovery Plan

**Date opened:** 2026-10-18  
**Status:** Active incident. Do not call generation fixed until authenticated end-to-end tests pass.  
**Scope:** Learn lesson generation, Cortex recovery, Exam Simulation generation and marking, visual/UI reliability, and icon consistency.

## Executive finding

The repository contains several attempted reliability fixes, but important fixes remain isolated in draft pull requests and are not automatically part of production:

- PR #363 adds a provider-exhaustion fallback to the section-generation endpoint and a curated Physics: Waves lesson. It is still draft and unmerged.
- PR #365 adds local section-repair/quality-gap repair, durable learner signals, and local-model progress. It is still draft and unmerged.
- PR #369 is a large platform redesign, also draft and unmerged. Its own validation notes explicitly say authenticated browser journeys, responsive visual QA, and parts of the route inventory remain incomplete.
- PR #344 documents a structured lesson-output contract and bounded repair, but the presence of an older PR is not evidence that the currently deployed generation path is reliable.

**Conclusion:** A green build or HTTP 200 on a protected page is not a successful lesson-generation test. Production reliability must be demonstrated with a signed-in learner, a real lesson request, provider-failure simulation, persisted lesson verification, refresh/resume, and Exam Simulation generation and marking.

## Failure modes to verify and close

### P0: Lesson generation

1. Trace one request from UI submit through the durable job, API route, Cortex execution, provider/local lanes, validation, persistence, and reader rendering.
2. Record a stable request/job ID and stage-specific failure code at every boundary. Never expose secrets or raw provider payloads.
3. Confirm section-mode provider exhaustion reaches the exact-topic curated fallback before returning an error.
4. Confirm valid JSON, structured content, and supported Markdown all normalize into the same canonical lesson schema.
5. Confirm the section count and quality contract agree for narrow and broad topics. A four-section lesson must not be rejected by a validator that silently requires a fifth section.
6. Repair only identified quality gaps, with a strict attempt/time budget. Preserve valid sections and checkpoints.
7. A cloud exception must not bypass local recovery. Do not start a large first-time local-model download invisibly.
8. An exact curated/offline fallback must be clearly labelled as curated fallback, quality-checked, saved, and usable. Never claim AI-generated when it was not.
9. Save valid generated content before optional memory, analytics, XP, or insight work. Best-effort secondary systems must not turn a completed lesson into a failed lesson.
10. Retry must reuse the same durable job/checkpoint and must not duplicate lessons or create a loop of progress values that appear to restart.
11. Verify database text sanitization, authorization, generation leases, RLS, idempotent save, and the final persisted row.
12. For topics without an exact curated lesson and with every model lane unavailable, show an honest, actionable recoverable error and preserve the request/checkpoint. Never fabricate topic coverage.

### P0: Exam Simulation

1. Test each stage separately: setup validation, generation, schema validation, answer autosave, timer/resume, submission, marking, results persistence, and retry.
2. Generated questions must match the selected subject, topic, level, count, question type, marks, and expected answer/marking criteria. Reject empty, duplicate, malformed, or off-topic papers.
3. Clearly distinguish AI-generated questions, verified past-paper material, and deterministic fallback questions. Never present fallback questions as official Cambridge/ZIMSEC questions.
4. Marking failure must preserve answers and allow a safe retry. Local marking must clearly communicate its limits and must not pretend to be equivalent to full examiner marking.
5. Prevent double submission, duplicate result writes, timer reset on refresh, and a result screen that implies success when generation/marking failed.
6. Exercise keyboard navigation, narrow-screen layout, dialog focus, accessible errors, and loading/empty/offline states.

### P1: Visual system and icons

1. Use one coherent icon library/feature-mark system, consistent even-pixel sizing and stroke weight, and a single optical alignment rule.
2. Prefer clean transparent SVG/icon assets where possible. Raster PWA assets should have transparent backgrounds only when that matches the brand mark; ensure they remain legible against both light and dark surfaces.
3. Avoid emoji or mixed icon styles in navigation. Decorative marks must not replace accessible text labels.
4. Verify favicon, app icon, Apple touch icon, PWA manifest icons, and in-app feature marks against a rendered size grid.
5. Keep neutral-first surfaces, clear contrast, visible focus, responsive spacing, reduced-motion support, and explicit success/error/offline states.
6. This is an upgrade, not a redesign that breaks working routes or removes existing user data.

## Release gates (all required)

- [ ] Run npm run lint
- [ ] Run npx tsc --noEmit
- [ ] Run npm test
- [ ] Run npm run build
- [ ] Add/execute deterministic tests for provider exhaustion, fallback matching, malformed JSON, missing sections, bounded repair, failed persistence, checkpoint resume, and no-provider mode.
- [ ] Run a signed-in browser acceptance journey for lesson generation, save, refresh, resume, open, and retry.
- [ ] Simulate provider 429/503/timeout and verify deterministic/local recovery without an infinite retry.
- [ ] Run signed-in Exam Simulation generation, answer autosave, submit, marking, result persistence, and retry journeys.
- [ ] Check mobile, tablet, and desktop screenshots; keyboard and screen-reader errors; light and dark themes; icon sizes/transparency.
- [ ] Verify preview deployment commit matches the tested branch head.
- [ ] Merge only the focused reliability fixes after the above gates pass; do not merge the entire 97-file redesign as a shortcut.

## Working rule

Do not say fixed because a patch exists, CI passes, a preview is READY, or a page returns HTTP 200. The incident closes only after the learner-visible workflow succeeds and the saved result is verified.

## Production evidence gathered on 2026-10-18

Vercel grouped runtime errors for the last seven days show the following on the production `/api/learn` route:

- **35 occurrences** of `Provider chain exhausted within 22000ms`, affecting 5 users; last seen 2026-10-18 13:44 UTC.
- **23 occurrences** of Gemini abort/timeout failures, affecting 5 users; last seen 2026-10-18 13:44 UTC.
- **12 occurrences** of Cloudflare provider abort/timeout failures, affecting 4 users; last seen 2026-10-18 13:42 UTC.
- **9 occurrences** of Gemini HTTP 503 / `UNAVAILABLE`, affecting 4 users; last seen 2026-10-18 13:42 UTC.
- **8 occurrences** of lesson finalization failing because a null character was not permitted, affecting 1 user, between 2026-10-13 23:15 and 23:41 UTC. The repository now has a null-character sanitizer, but the incident must verify that all finalization paths and the active production deployment use it.

The log query covers the past seven days and the route filters supplied for Learn and Exam endpoints; the returned clusters were all Learn errors. Runtime-log retention on the current Vercel plan did not permit querying the full seven-day raw log stream, so this evidence is from the aggregated runtime-error clusters, not a complete request trace.

### What this evidence changes

This is not merely a UI complaint. Production logs prove provider-chain exhaustion is still happening today. The next code pass must reduce dependence on the provider chain and make fallback/recovery work for the exact request, while preserving a clear honest failure state for topics without verified fallback material. A provider retry alone is not a fix. The null-character failure also shows that successful generation can still fail during final persistence, so persistence is a first-class test stage.


## First repair pass opened

Two focused draft PRs now implement and test the first code-level reliability changes:

- **PR #380** (`fix(learn): prevent optional learner services from failing lessons`): the Learn route previously awaited the learner request-signal write before starting generation, then awaited memory and XP side effects after the lesson was already saved. The request signal is now non-blocking, learner-memory enrichment is bounded to 900 ms and safely skipped if slow/unavailable, and post-save side effects cannot turn a successful durable save into a generation error. the combined typecheck/lint/test/build CI job passed; this is not merged.
- **PR #381** (`fix(exam): validate generated papers before starting`): Exam Simulation now validates exact question count, IDs, question types, duplicate question text, topic, question content, marks, and multiple-choice options before entering the timed workspace. The validator has unit tests for malformed and duplicate data. the combined typecheck/lint/test/build CI job passed; this is not merged.

These are focused first repairs, not the complete incident fix. Provider exhaustion still needs authenticated production-like acceptance testing, and the remaining Exam marking/resume journeys plus UI/icon QA are still release gates. Keep all PRs unmerged until their CI checks pass and the signed-in workflows are tested.


## Follow-up verification and timer hygiene

- **PR #380 CI:** combined typecheck, lint, tests, and build completed successfully on the current recorded run. The code is still unmerged and has not been proven by a signed-in end-to-end lesson generation.
- **PR #381 CI:** combined typecheck, lint, tests, and build completed successfully on the current recorded run. This verifies the paper validator and its unit tests compile and pass, but does not prove the complete Exam Simulation, marking, resume, and persistence journeys.
- **PR #382** (`fix(ai): clear provider hard-timeout timers after settlement`): clears the per-provider hard-timeout timer when an attempt settles, and clears the telemetry budget timer when telemetry completes early. This is bounded-work cleanup, not a provider-availability fix. the combined typecheck/lint/test/build CI job passed for the latest commit.
- **PR #383** (`test(cortex): cover immutable nested lesson sanitation`): adds regression coverage for recursively sanitizing array values without mutating the input payload. the combined typecheck/lint/test/build CI job passed.
- **PR #369** remains a draft product-wide redesign and is not release-ready while authenticated journey and responsive visual QA gates remain incomplete.

Do not merge based on green CI alone. Next required evidence is a signed-in test that generates a known topic, persists it, reloads it from storage, and confirms no false failure is shown; plus Exam generation, answer saving, marking, result persistence, and resume. Continue to check the deployed commit and production runtime errors after release.


## Existing browser acceptance test discovered

The repository already contains `e2e/learn/broad-topics.spec.ts`. It signs in using `E2E_EMAIL` and `E2E_PASSWORD`, then generates a real broad topic from the account's existing Learn subjects. It checks that the learner reaches the lesson, that at least 16 lesson units render, that enough units contain substantive text, and that required deep-learning sections are present. The topic must be supplied through `E2E_LEARN_TOPICS`; the test deliberately does not invent a synthetic success case.

This browser test has **not** been run in this work pass because its valid signed-in test account and real curriculum topic are environment-specific secrets/configuration, and CI's standard typecheck/lint/unit-test/build job does not execute it. It is the best existing acceptance gate to run when the E2E credentials are available. A separate Exam Simulation browser journey is still needed for generated paper, answer persistence, marking, results, and resume.


## 2026-10-18 post-merge deployment checkpoint

The four focused code changes and the incident report have now been merged to `main`:

- PR #380 Learn secondary-failure isolation: merge commit `07cc5e17160a4ee874f16916f655f932599ab227`.
- PR #381 generated-paper validation: merge commit `3fd0e6492fdce0d6cdb533a10ecbeb2fa58c4a85`.
- PR #382 AI provider and telemetry timer cleanup: merge commit `9f813e0af9613b8d35fa21afa3f177fc5c2df1e6`.
- PR #383 sanitizer regression coverage: merge commit `c5b76993263a178f1e93e9ee01a6a87071365f2b`.
- PR #379 this incident report: merge commit `8561065cc0a27a1f1098651847690395dee0b8ad`.

Vercel reports the production deployment for main commit `8561065cc0a27a1f1098651847690395dee0b8ad` as **READY**, with the production alias `shadecodestudent.vercel.app`. The standard CI workflows passed for the four code PR heads before merge.

A fresh grouped runtime-error query for the last hour returned no recorded errors for `/api/learn` or `/api/exam/generate`. This is a useful early signal, not proof of success: there may have been little or no traffic, and grouped error tables do not confirm lesson content or persisted exam results.

The new Exam Simulation acceptance test is in PR #384. Its standard CI passed, but authenticated Playwright execution still requires `E2E_EMAIL`, `E2E_PASSWORD`, and `E2E_EXAM_SUBJECT`. The existing signed-in Learn acceptance test also remains unrun in this pass.

**Incident remains open for end-to-end acceptance.** Do not mark lesson generation or Exam Simulation fully resolved until signed-in workflows verify generation, persistence, reload/resume, marking, and result persistence against the deployed app. The broader redesign PR #369 remains draft because visual and authenticated journey QA are incomplete.

## 2026-10-28 lesson-cache reuse repair

The Learn lesson-generation route now keys its validated in-process cache by canonical subject + topic + level + format, rather than appending the requesting user ID. This permits learners served by the same warm server instance to reuse generic curriculum content instead of making a duplicate provider call. A cache hit receives a fresh lesson ID and timestamp so the originating learner's lesson identity is not reused. If a cached entry fails structural or completeness validation, only that entry is evicted; the previous behavior cleared every cached lesson, allowing one malformed entry to flush unrelated valid work.

**Scope limitation:** this cache is still process-local and may be cold on a new serverless instance or deployment. This is not yet a durable cross-instance/shared cache, and it does not prove provider-exhaustion recovery is fixed. Signed-in end-to-end generation, save, refresh/resume, and provider-failure tests remain release gates.
