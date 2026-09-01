# Shadecode Student — Cortex Devlog

Autonomous improvement log maintained by Cortex Engine.

---

## 2026-09-01 — First Discovery vertical slice: Number Explorer

The first Primary experience slice is now in the product, built on the shared learning spine rather than a Primary-only analytics system.

**Implemented:**
+- [HIGH] Added `/discovery` with a child-oriented Maths `Number Explorer` activity.
+- [HIGH] Five short number-sense challenges use immediate, encouraging feedback and age-appropriate language without requiring AI or network access.
+- [HIGH] Attempt state, score and the richer topic learning state persist locally so the activity can resume after reload/offline use.
+- [HIGH] Each attempt emits a canonical `question.attempted` event with deterministic source identity and graded evidence metadata; the final activity emits `quiz.completed` evidence.
+- [HIGH] Primary dashboard routing now sends Primary learners to Discovery instead of the general Secondary Learn surface.
+- [MEDIUM] The activity uses the shared `updateLearningState` reducer for mastery rather than creating a Primary-specific scoring algorithm.
+
**Verification boundary:** the UI and local state path are implemented, but browser E2E verification and authenticated reconnect/replay verification still remain before this slice is marked production-complete.
+
---

## 2026-09-01 — Sync ownership hardening and graded evidence preservation

This pass used the live Supabase project to audit the actual revision protocol rather than trusting repository-only assumptions.

**Verified and fixed:**
+- [HIGH] Live `apply_sync_mutation` uses per-user/store/record optimistic concurrency with `baseVersion`, `clientVersion`, and `deviceId`.
+- [HIGH] Found and closed an ownership seam in the sync RPC: an ID collision could reach an upsert path before ownership was explicitly checked. The function now rejects existing records owned by another account before mutation and constrains deletes/upserts to the authenticated owner.
+- [HIGH] Legacy `subjects` rows with NULL ownership are not claimable through the sync path.
+- [HIGH] The repository now contains the matching Supabase migration so live database behavior is represented in source history.
+- [HIGH] The canonical event-to-observation adapter now preserves graded `percentage`/`evidenceScore` metadata instead of silently collapsing scored evidence to binary correctness.
+- [HIGH] Regression coverage was extended for graded evidence mapping.
+
**Current sync boundary:**
+`local record → authenticated queued mutation → /api/sync → revision check → owner-safe database mutation → version acknowledgement → local hydration`.
+
**Important remaining gate:** the richer reducer and projection are now deterministic and defined in code, but durable projection must still be wired into the selected evidence consumers without double-counting existing exam aggregates. Authenticated/offline/replay E2E coverage is also still required.
+
---

## 2026-09-01 — Mastery transition reconciliation and exam evidence hardening

This cycle closed an important intelligence seam without opening a parallel system or PR. Canonical exam evidence is now question-level, durable event ingress is persistence-only, and the score transition shared by Cortex and production topic mastery is centralized.

**Verified this cycle:**
+- [HIGH] Exam Simulation emits one canonical `question.attempted` event per final graded question, alongside the aggregate `exam.completed` event. Events use deterministic exam/question identity and carry correctness, score, max score and derived percentage metadata.
+- [HIGH] Canonical event persistence is intentionally separated from mastery mutation. The durable `/api/intelligence/events` path no longer independently updates `topic_mastery`, preventing double-counting when exam marking already persists graded topic results.
+- [HIGH] Added `src/lib/intelligence/masteryTransition.ts` as the shared pure score-transition rule. Cortex `updateLearningState` and production `blendMastery` now use the same 70/30 history/evidence EMA heuristic.
+- [HIGH] Added regression coverage for the shared transition, including first evidence, bounds and deterministic correctness mapping.
+- [MEDIUM] The richer Cortex dimensions (retention, confidence, stability, exposure, error rate, response speed, prerequisite health, recent improvement and uncertainty) remain separate until their persistence and calibration semantics are explicitly unified. No speculative second reducer was introduced.
+- [MEDIUM] Per-question response timing remains available in the exam answer model but is not yet populated reliably by the workspace timer, so timing is not fabricated into learning evidence.

**Current architecture:**
+`product action → canonical event → authenticated durable evidence → shared mastery transition → learner state → Cortex/recommendation`.

**Next engineering gate:** define the authoritative richer-state reducer and persistence projection, audit revision-based offline sync, add authenticated/offline/replay E2E coverage, then build the first Discovery Primary activity on the shared learning spine.

---

## 2026-09-01 — Master roadmap synchronization and learning-evidence audit

This cycle reconciles the product roadmap with the repository's actual state before expanding the feature surface. The master roadmap now explicitly covers the full Shadecode learning operating system, while Discovery, Student and Campus remain experience boundaries rather than the entire roadmap.

**Verified this cycle:**
+- [HIGH] Documentation baseline is synchronized around the master roadmap, platform boundaries, canonical learning events, offline sync contract, product vision and current project status.
+- [HIGH] Canonical learning-event delivery is confirmed as local-first and queue-backed. The browser emitter posts to `/api/intelligence/events`, queues failures/offline events locally, deduplicates queued source/sourceEventId pairs, and flushes on reconnect.
+- [HIGH] Learn currently emits lesson-view evidence from the lesson launcher. The canonical helper also exposes lesson-completion, exam, and question-attempt event builders, but repository search shows some builders are not yet wired to real product actions. This is an integration gap, not a reason to create another event system.
+- [HIGH] Exam Simulation now emits aggregate completion and final graded question-attempt evidence through the canonical helper.
+- [HIGH] Mastery semantics were intentionally blocked from broadening until the local Cortex learning-state heuristic, exam `blendMastery` logic and durable `topic_mastery` RPC update path were reconciled. The durable RPC is now persistence-only and the score transition is shared.
+- [MEDIUM] Primary remains the next experience slice, but it must use the same canonical evidence → local persistence → mastery → Cortex recommendation spine rather than introducing a Primary-only intelligence contract.

**Next engineering gate:** define the richer-state reducer, audit the live revision/sync protocol, add authenticated/offline/replay verification, then add the first Primary activity.

---

## 2026-08-29 — Hardening pass: Project Studio, curriculum coverage, canonical events

This pass deliberately continued from the repository's current truth instead of opening another large feature branch. The main product foundations are already present, so the useful work was to remove small correctness hazards and make the remaining boundaries explicit.

**Improvements this cycle:**
+- [HIGH] Hardened Project Studio recovery snapshot pruning. An IndexedDB transaction abort is now treated as a failure rather than a successful cleanup, making recovery behavior safer without changing the existing rolling snapshot policy.
+- [HIGH] Hardened canonical learning-event normalization. Invalid timestamps are now rejected instead of being silently converted to `1970-01-01`, which could manufacture misleading chronology in downstream learning evidence.
+- [HIGH] Added a regression test for malformed learning-event timestamps while retaining the existing replay and cross-user identity guarantees.
+- [MEDIUM] Hardened curriculum coverage calculations. Completion counts now intersect completed IDs with the active curriculum catalog, and weak/strong topic signals are similarly scoped to real catalog topics. This prevents stale or unrelated progress records from inflating curriculum coverage.
+- [MEDIUM] Added regression coverage for catalog-scoped coverage and prerequisite-aware study ordering.
+- [MEDIUM] Updated the canonical learning-event architecture document to record the real production boundary: the existing `learning_events` table predates the normalized contract and must not be reused blindly as a canonical store.
+- [MEDIUM] Updated Project Studio finish-line documentation and the current project-status document so shipped foundations are not confused with end-to-end completion gates.

**Important boundary preserved:** no duplicate project model, event schema, mastery system, or curriculum engine was created. The remaining work is integration and verification, not another parallel implementation.

---

## 2026-08-29 — Product truth and release documentation

Refreshed the public product positioning and release documentation around the actual current surface: Cortex, Learn, Exam Simulation, Exam Hub, Math Checker, Project Studio, study organisation, gamification and local-first foundations. Strategic capabilities remain explicitly staged as foundations, in-progress work or research rather than being marketed as finished.

---

## Historical entries

Earlier Cortex cycles remain below this line as the audit trail. Do not delete them when adding future entries.
