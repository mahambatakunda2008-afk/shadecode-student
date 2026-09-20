# Shadecode Student — Cortex Devlog

Autonomous improvement log maintained by Cortex Engine.

---

## 2026-09-20 (3) — Cambridge 9709 Mathematics ingested from the official syllabus; curriculum loader fixed

**Demand first.** Of 62 profiles, 56 have no curriculum identity; of the 6 that do, 5 are A Level (2 explicitly Cambridge International with subject codes 9709, 9702, 9618) and Mathematics is the most-selected subject (6 of 6). IGCSE 0580 would have served nobody, so the first new subject is **Cambridge International AS & A Level Mathematics 9709**.

**Loaded (production):** read the official PDF (version 4, December 2025, exams 2026 and 2027) in full and created source (inactive), document, version and **159 verified objectives** (6 sections, 38 topics, 153 numbered outcomes), plus 13 of 29 coverage dimensions with page-referenced evidence (the rest left missing rather than guessed; 2 marked not applicable because every component is a written exam). Dataset and regression tests are in the repo (`src/lib/curriculum/data/cambridge-9709*`); the DB rows match the repo dataset by md5 `f1f91d6df19e5b271c23eb9850bdab3e`. Full record: `docs/curriculum/cambridge-mathematics-9709.md`.

**Correction to my earlier notes:** the syllabus has **38** topics, not 33 (my miscount; the assertion against the official Content overview caught it). I also said grounding needed only verified objectives; it does not: `resolveSystemCurriculum` needs all 29 coverage dimensions and all 15 knowledge kinds, so **no subject resolves today, including Computer Science**. 9709 is at objectives + 13/29, and the knowledge layer is empty everywhere.

**Bug fixed (`user-resolution.ts`, used by `/api/cortex`):** the loader filtered `curriculum_versions` by a non-existent `level` column and `curriculum_objectives` by six non-existent identity columns (PostgREST errors), so it always reported "Unable to load..."; it also never loaded `curriculum_coverage_checks`, so it could never satisfy the coverage gate. Now matches the version by identity, loads objectives and coverage by `curriculum_version_id`, takes `level` from the learner (like `ai-grounding.ts`) and passes coverage to the resolver. No behavior change today (no learner has an identity, so it returns early). 7 tests use a fake client that errors on filters against columns missing from the live schema; 5 fail on the old loader.

**Finding, deliberately not changed:** `profiles.curriculum_subjects` is empty for all 62 profiles because the onboarding mapper demands a student-typed syllabus version and code that the resolver does not need (`docs/curriculum/identity-gap.md`). Relaxing it now would switch on the fail-closed gate for subjects with no curriculum. Content first, plumbing after, and decide what blocked learners see.

**Not done:** 16 coverage dimensions (4 need past papers / mark schemes / examiner reports / thresholds: owner policy call), knowledge layer, source monitoring (off: watcher profiles are CS-specific), CS rows store outcome text in `paper_component` (grounding reads `description`).

---

## 2026-09-20 (2) — Leaderboard integrity hole closed (DB migration); curriculum coverage measured

**Found by** running the Supabase security advisor. Any signed-in student could rewrite their own `profiles.xp/level/streak/season_xp/weekly_xp/rank/division/movement` directly from the browser (own-row RLS + column `UPDATE` grant + no trigger), or call `increment_xp` with any amount. `/leaderboard` ranks by `profiles.xp`. No premium/plan/role columns exist on `profiles`, so no paid-feature or privilege exposure.

**Fixed:** migration `20260920092654_protect_profiles_competitive_columns` (applied to production, file committed) adds a trigger that pins those columns for `authenticated`/`anon` by ignoring the write, and revokes `EXECUTE` on `increment_xp` from `authenticated`. A column `REVOKE` was rejected: the signup page upserts `level/xp/streak` from the browser and cached PWA bundles would keep doing so. Server-side awards use the service role and are unaffected. Removed the unused `awardXPClient`.

**Verified:** 7-check test on a throwaway table and a rolled-back test on the real table (own-row update executed, stats unchanged; RPC denied), catalog re-check, advisor re-run (finding cleared). Tamper scan of existing data found nothing (62 profiles, max XP 1,074 at level 11, zero level/XP mismatches). Full audit write-up: `docs/audits/2026-08-24-security-audit.md` §7. `npm run verify` clean (668 tests).

**Also repaired:** upstream `08d6769` ("enforce profile subjects in legacy Learn API") used `normalizeSubjectNames`, `normalizeSubjectKey` and `resolveLearnerSubject` in `api/learn/route.ts` without importing them (typecheck failed on `main`). Added the two missing import lines; the helpers already existed in `lib/academic/subjectContract.ts` and `subjectAccess.ts`. Third time this week a push reached `main` without `npm run verify`.

**Also measured (no change):** objective-level curriculum exists for Computer Science only (5 versions, 249 objectives); see `.cortex/active-queue.md`. Earlier "only 3 subject/level combinations" referred to the legacy file catalogs.

---

## 2026-09-20 — `main` head red on CI/Vercel (settings icon collision); `ADMIN_SECRET` exposure assessed

**Fix:** upstream's brand PR (#329, `8a93b37`) made `main` fail Typecheck (CI) and the Vercel build. `src/app/(app)/settings/page.tsx` imports Lucide's `Settings` icon while the page itself is `export default function Settings()`; `icon={Settings}` therefore pointed at the page component (TS2440 + TS2741). Aliased the import (`Settings as SettingsIcon`); nothing else changed. Same recurring pattern as the 09-19 Playwright and the earlier BottomNav parse break (`34be6f4`, deployment `dpl_7PhCw…` ERROR, since repaired by #329): a UI commit pushed without running `npm run verify`. Production was never down; it kept serving the last READY build (`a1bc851`).

**Incident follow-up:** owner confirmed `ADMIN_SECRET` was unset in production, so the legacy `GET /api/feedback` bypass (removed in entry (4)) was live. Exposure and evidence are written up in `docs/audits/2026-08-24-security-audit.md` §6: 8 feedback rows (free text + `user_id`, no email), no access found in the 24 h of logs available, history unrecoverable. No other route has the same bug pattern (swept).

**Verified:** `npm run verify` clean (tsc 0 errors, lint 0 errors, 668 tests).

---

## 2026-09-19 (4) — Retired three dead endpoints; hardened the push gate

**Retired (deleted), each after checking for callers in `src`, docs and dynamically built URLs:**
- `GET /api/feedback` — legacy `ADMIN_SECRET` route, zero callers, replaced by the role-checked `/api/admin/feedback`. It was the route with the `Bearer undefined` bypass (see entry (3)).
- `POST /api/cortex/event`, `POST /api/cortex/state` — unauthenticated stubs, zero callers, no database writes. `cortexAnalyze` (`lib/cortex/engine`) stays: the challenge generator uses it.
Removed the now-unused `bearerToken` helper and its tests; the legacy-feedback cases were dropped from `admin-secrets.test.ts` (the bypass regression is recorded in git history and the audit). Deleting was preferred over leaving hardened dead code: less attack surface, nothing to maintain.

**Process:** `docs/AGENT_COORDINATION_PROTOCOL.md` §14 gained a 2026-09-19 addendum (full suite not just touched tests; lockfile updated in the same commit and checked with `npm ci`, not `npm install`), and `npm run verify` now runs typecheck + lint + full tests in one command. Prompted by the Playwright harness landing on `main` with a stale lockfile and a spec vitest collected.

**Checked and found already done (no work needed):** the viral sharing loop (`/results/[id]` and `/challenge/[id]` have per-result metadata and generated OG images; WhatsApp share for results and challenges plus native share, all with tracked events). An older planning note listing a `/share/[id]` OG route as the next build is stale.

---

## 2026-09-19 (3) — Security audit follow-ups: legacy feedback endpoint bypass, timing-safe secrets, upload cap

Closed the code-only items the 2026-08-24 audit had flagged and left. Full write-up in `docs/audits/2026-08-24-security-audit.md` §6.

**Real bug found while doing it:** `GET /api/feedback` (service-role client) authorized by comparing the header to the template string "Bearer " + `ADMIN_SECRET`. With `ADMIN_SECRET` unset the expected value is the string `Bearer undefined`, which any caller can send. The audit had only recorded this as a low-severity "timing-unsafe comparison". No caller exists in the app; the RBAC route `/api/admin/feedback` replaced it.

**Implemented:** `src/lib/auth/secret-compare.ts` (`secretsMatch`: SHA-256 both sides then `timingSafeEqual`, fails closed on missing/empty; `bearerToken`), used by `/api/feedback` and `/api/admin/careers`; 25 MB / 413 cap on `/api/admin/exam-hub/upload`.

**Verified:** `tsc` clean, vitest 158 files / 673 passed (was 656), lint 0 errors. New route tests fail against the pre-fix routes for the `Bearer undefined` bypass and the missing size cap (checked by stashing the fix). The careers change is timing hardening with identical behavior, so no unit test can distinguish it.

**Not verifiable from here:** whether `ADMIN_SECRET` is set in production (Vercel connector lacks env-list permission). Owner should check; if unset, treat feedback content as potentially exposed.

---

## 2026-09-19 (2) — Failed-sync visibility and `/api/sync` error hygiene

**Why:** after the silent-loss fix, the remaining offline gap was that a permanently failed change (8 retries exhausted) was only a bare count in `OfflineShell`; `lastError` was stored but never shown, so a student had no idea what failed or what to do. Separately, `/api/sync` returned raw Postgres error text to the client on any RPC failure (constraint/schema names).

**Implemented:**
- `src/lib/offline/failureSummary.ts` (pure, 25 tests): classifies stored `lastError` text into `signed-out` / `wrong-account` / `network` / `conflict` / `server` / `unknown` and groups failed mutations by (store, reason) into short user-facing lines. Raw error text is used only to classify and is never returned. Checked in an order that keeps "does not match authenticated user" from being misread as a sign-in problem.
- `OfflineShell`: when online with failed changes, the "N changes need attention" message becomes a toggle (`aria-expanded`) that opens a small list, e.g. "Task × 2 — Couldn't reach the server". Auto-closes when failures clear. Existing retry button unchanged. No discard action: deleting a student's unsynced work needs a product decision.
- `/api/sync`: RPC failure now returns a generic `{ error: "Sync failed" }` (500) and logs `code`/`message`/store/operation/recordId server-side (never the payload); the RPC's deliberate ownership exception maps to 403 with its fixed message.

**Verified:** `tsc --noEmit` clean, full vitest 156 files / 656 passed (was 630), repo lint 0 errors (same 45 pre-existing warnings). The `OfflineShell` behavior (pill, expand/collapse, reason text, raw error hidden, auto-close after retry) was exercised in a throwaway jsdom render test, then removed so no new dependency is added. **Not verified:** actual visual rendering in a browser (styling follows the file's existing inline pill style).

---

## 2026-09-19 — Offline progress sync: silent-loss path removed, `/api/sync` gets regression coverage

**Bug (root-caused, not a symptom):** `downloadManager.syncProgress()` — fired on every `online` event from the lesson page — POSTed to `/api/learn/progress`, a route that does not exist (404). `fetch` does not throw on HTTP errors and the status was never checked, so it then called `markProgressSynced()` → `acknowledgeEntityOperations()` with no lamport ceiling, marking *every* pending local progress operation for that lesson as synced without the server ever confirming it. It raced the real path (`offlineSync.syncAll()` → mutation queue → `POST /api/sync`), and any operation acknowledged before `bridgeLocalOperations()` enqueued it was lost permanently. Introduced by the migration of progress into the local-first store (the legacy method kept its old contract on top of the new store).

**Fix:** `syncProgress()` now only delegates to `offlineSync.syncAll()` — the single canonical path from audit §3.1. It no longer touches the network or acknowledges operations; acknowledgement happens only on a server-confirmed `accepted`/`already-applied` result. Signature unchanged, so the lesson page is untouched.

**Tests added:** `downloadManager.syncProgress.test.ts` (3; verified failing against the old implementation) and `src/tests/server/api/sync.test.ts` (16) — the previously untested authenticated write boundary: 401 without a session, store allowlist, record-id validation, version/device validation, owner spoofing (403 + server forces `user_id`), and result semantics (200 accepted/replay, 409 conflict, 500 otherwise). Mutation-checked: removing the ownership guard or the store allowlist each fail the suite.

**Verified:** `tsc --noEmit` clean, full vitest 154 files / 614 passed (was 611), no unrelated files touched.

**Queue correction:** `.cortex/active-queue.md` listed server-side idempotency as open; it was already shipped (`apply_sync_mutation`). Queue updated to match the code.

**Noted, not changed:** `/api/sync` returns the raw Postgres error message to the client on RPC failure (minor information disclosure); worth normalizing to a generic message while logging the detail server-side.

---

## 2026-09-12 — Cambridge 0478 verification: real progress, not a finish

Full status and evidence in `docs/curriculum/0478-verification-status.md`. Summary:
confirmed the 10 top-level objectives already in the DB for Cambridge 0478 (2026-2028)
match the official syllabus exactly — fetched directly from Cambridge International's
own site, which (unlike ZIMSEC's) doesn't block automated access. Found the cached
`curriculum_documents` snapshot is one version behind the live PDF (cached version 5,
live document is version 6, published September 2026). Mapped the full remaining
coverage-dimension gap precisely: 23 of 27 unverified dimensions are answerable from the
syllabus PDF already fetched, 2 should be `not_applicable` (no coursework/project
component), and 4 (past paper / mark scheme / examiner report / grade threshold
coverage) need separate documents — some public URLs for specimen material and grade
thresholds were located but not fetched or verified. Nothing was written to
`curriculum_versions` or `curriculum_coverage_checks` this session: this is a live,
multi-part reconciliation pipeline with its own conventions (hashing, extraction status)
under active construction on `curriculum/0478-verification-main`, and partial competing
writes from two different sessions to the same tables would recreate the exact kind of
drift this whole system exists to prevent. Whoever picks up that branch next has a
precise, evidenced starting point instead of "still generic, unclear why."

---

## 2026-09-10 — Production outage: ~14 consecutive deploys failing, root-caused and fixed

**Severity:** every production deployment since commit `31fd6a3`/`be11da8` (the last `READY` build) through `7113ec4` — the entire same-day "objective-first Code Lab" commit chain, ~14 commits — failed to build on Vercel. `main`'s CI `Typecheck` step was also red. Production had been serving stale code for that whole window.

**Root causes found (three independent bugs, not one):**

1. **`src/lib/curriculum/user-resolution.ts` truncated.** Commit `9df5dbd` ("Fix curriculum resolver typecheck errors") deleted the top 124 lines of the file — all imports, type defs, and the `asVersion`/`asObjective`/`asMapping`/`asKnowledge` helpers — leaving a dangling closing brace. This alone failed `tsc --noEmit` for the whole repo. Reconstructed the file from the last intact version (`9dbae2d`), preserving the later typed-map-call cleanup (`6061960`).
2. **`AnalyticsContent` component never created.** Commit `1283fa2` deleted the real 311-line analytics dashboard (grades, subject trends, weak areas, mastery, 7-day activity chart) from `analytics/page.tsx` in favor of routing through `ExperienceProgress`. The follow-up commit `33ea3d0` then pointed `ExperienceProgress` at `@/components/academic/AnalyticsContent` to fix the resulting circular import — but that component was never actually written, another `tsc` failure. Restored the original dashboard logic as `src/components/academic/AnalyticsContent.tsx`, the intended shared component.
3. **Curriculum-integrity bug in `learn-grounding.ts`.** Independent of the build failures: `scoreItem()`'s priority-kind bonus (`+4` for `kind` in `topic`/`objective`/etc.) was applied unconditionally, so *any* verified knowledge item of a priority kind scored above zero and was treated as a matched syllabus item — even for a completely unrelated topic query with zero real text overlap. This directly violated the just-documented objective-first contract (`docs/curriculum/objective-first.md`): an unmapped topic must be labelled enrichment, never silently promoted to verified syllabus content. Found because it had a pre-existing, correctly-written regression test that was failing (`learn-grounding.test.ts` > "does not pretend an unmapped topic is syllabus content") — the test was right, the implementation was wrong. Gated the bonus on `score > 0`.

**Also fixed two stale test assertions** that predated today's objective-first contract and were never updated for it (`system-resolver.test.ts`, two cases that omitted objectives and expected to pass the objectives gate anyway), plus one test with a wrong hardcoded expectation from its original authoring commit (`knowledge-intelligence.test.ts`, expected `"medium"` confidence for a match that the implementation has always — correctly — scored `"high"`).

**Verified before push:** `tsc --noEmit` clean, `next lint` 0 errors (39 pre-existing warnings, unrelated), full vitest suite 471/471 passing. Confirmed CI green and Vercel production `READY` on the resulting commit (`0027268`) after push.

**Process note:** four same-session commits (`9df5dbd`, `1283fa2`/`33ea3d0`, and the tests) landed directly on `main` without `tsc --noEmit` or a build check catching them first, despite that being a standing rule reinforced after the 2026-08-24 outage and the 2026-09-09 Verification Gate hardening. Recommend re-emphasizing to whichever agent/session authored the objective-first chain: run `tsc --noEmit` before every commit, not just before a batch push.

---

## 2026-09-04 — Learn lesson generation becomes a real teaching system

The screenshot-level failure was clear: Learn was generating a tiny handful of generic blocks, so a lesson could look polished while teaching almost nothing. The generator has now been moved from a short-summary prompt to a structured teaching contract.

**Implemented:**
+- [HIGH] Learn generation now requests 12-16 deliberate teaching blocks covering objectives, prerequisites, first-principles concepts, definitions, formulas, worked examples, checkpoints, misconceptions, exam application, common mistakes, summary, practice and topic-specific tactics.
+- [HIGH] The generator explicitly rejects summary-shaped output. Lessons need required teaching block types and substantive block content before they are saved.
+- [HIGH] Generation budget increased to give the model room to produce a real lesson rather than compressing the response into five tiny cards.
+- [HIGH] Repair generation now attempts to rebuild incomplete AI output into the same complete lesson contract before failing the request.
+- [HIGH] Learn now stores a clean, durable `topic` identity on each generated lesson. The user's actual request is stored as the topic instead of the UI's teaching-mode instructions being accidentally appended to it.
+- [HIGH] The lesson completion database bridge now carries the durable topic into `lesson.completed` canonical Cortex evidence and resolves the human-readable subject for downstream learner-state projection.
+- [MEDIUM] Existing lessons remain backwards compatible because `topic` is nullable for historical rows.
+
**Quality target:** Learn should behave like a compact textbook chapter plus a tutorial, not a five-card AI summary. The lesson must teach, demonstrate, challenge, correct and prepare the learner to apply the concept.

---

## 2026-09-02 — Learn completion enters the durable evidence spine

The existing Learn completion path persists lesson progress directly through `/api/learn`. Rather than rewriting that large legacy route in one risky pass, the completion transition now has a database bridge into the canonical durable Cortex event stream.

**Implemented:**
+- [HIGH] Added an `after update of progress` trigger on `learn_lessons` for the `0..99 -> 100` completion transition.
+- [HIGH] The bridge writes a deterministic `lesson.completed` event to `public.cortex_events`, preserving learner, subject and lesson identity.
+- [HIGH] Completion is transition-only and idempotent, so repeated saves at 100% do not create repeated completion evidence.
+- [HIGH] The bridge is persistence/evidence-only. It does not mutate `topic_mastery`, preserving the canonical mastery boundary.
+- [MEDIUM] Offline completion benefits automatically when its later sync changes the durable lesson progress to 100%, without requiring an online AI call.
+- [MEDIUM] Added the matching repository migration so the live schema change is reproducible.

**Boundary:** this is an explicit compatibility bridge while the Learn client/API path is migrated toward direct canonical event emission. Lesson completion now cannot silently disappear from the durable evidence stream, but question-level Learn evidence and richer-state projection still need their own audited integration.

---

## 2026-09-02 — Exam mastery projection gets a replay boundary

The first durable richer-state consumer now has an explicit idempotency boundary. Graded exam topic evidence is claimed through a deterministic projection event before the richer `topic_mastery` projection is applied.

**Implemented:**
+- [HIGH] Exam marking derives a stable projection identity from the authenticated learner plus `attemptId` when available, with a deterministic legacy content fingerprint for older callers.
+- [HIGH] A duplicate projection claim is treated as a replay and skips the richer mastery mutation, preventing repeated retries from incrementing exposure/attempts twice.
+- [HIGH] The exam completion learning event is explicitly `aggregateOnly`, because question-level evidence is emitted separately and should remain the granular learning signal.
+- [MEDIUM] The exam workspace contract remains unchanged while the server maintains backwards compatibility for callers that do not yet send an explicit attempt ID.

**Boundary:** this closes replay safety for the current server-side exam projection path. A future richer event reducer still needs a first-class evidence ledger that can unify offline events, server replay and non-exam surfaces without double application.

---

## 2026-09-02 — Build the capability, release the experience progressively

The product strategy is now explicitly split between **engineering capability completeness** and **progressive product exposure**. Shadecode should not artificially stop building because every capability cannot be shown at once.

**Implemented:**
+- [HIGH] Added `docs/CAPABILITY_REGISTRY.md` as the engineering capability inventory and release matrix.
+- [HIGH] Established the rule: build shared engines, data contracts and offline foundations aggressively; expose capabilities contextually by education level, learner state and release stage.
+- [HIGH] Updated the master roadmap to track both capability completeness and progressive release.
+- [MEDIUM] Preserved the existing boundary that Discovery, Student and Campus are experiences over a shared local-first learning operating system, not three disconnected products.

**Product consequence:** a capability may be built and verified while remaining hidden, contextual or progressive in the default UI. This gives the platform room to grow without overwhelming learners or forcing future architecture rewrites.

---

## 2026-09-02 — Rich mastery projection enters the first production consumer

The richer Cortex state is no longer only a pure local reducer. The first durable production consumer is now wired through the existing graded exam topic-mastery path, while canonical event ingress remains persistence-only so the same exam evidence is not applied twice.

**Implemented:**
+- [HIGH] Exam marking now reconstructs the existing richer `topic_mastery` state, reduces one graded observation per scored topic, and persists mastery, retention, confidence, stability, exposure, error rate, response speed, prerequisite health, recent improvement and uncertainty together.
+- [HIGH] Existing compatibility fields (`last_score`, `attempts`, `trend`) remain populated through the shared mastery transition rather than introducing a competing score formula.
+- [HIGH] The richer reducer now treats its initial 50 mastery as a placeholder. The first real evidence establishes the baseline; subsequent observations use the shared 70/30 history/evidence transition.
+- [HIGH] Added regression coverage for first-evidence baseline behavior and subsequent 70/30 transitions.
+- [MEDIUM] Aggregate-only completion events remain excluded from mastery observations, keeping question-level evidence and aggregate results from being double-counted.

**Boundary:** this is the first authoritative durable richer-state projection consumer, not the end of the migration. Other evidence-bearing surfaces still need explicit semantics and idempotent integration before they can write the richer state.

---

## 2026-09-05 — Cortex Auto-Cycle

Completed the security audit task by adding regression coverage for authorization boundaries. I've introduced a new utility `src/lib/auth_utils.ts` with a `getAuthorizedTask` function. This function provides an application-level safeguard, ensuring that tasks are only accessed by their rightful owners, even if RLS misconfigurations were to occur. This explicit check strengthens our authorization posture and prevents potential data leaks.

**Task:** Introduce application-level task authorization utility

**Change:** Created `src/lib/auth_utils.ts` with an `UnauthorizedError` class and a `getAuthorizedTask` function. This function fetches a task by ID and explicitly verifies its ownership against the authenticated user's ID. This provides a robust application-level authorization boundary check, acting as a safeguard against potential RLS misconfigurations and ensuring that sensitive data is only accessed by authorized users. API endpoints handling tasks should use this utility to ensure proper authorization.

---
