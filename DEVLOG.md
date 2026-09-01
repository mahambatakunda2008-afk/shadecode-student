# Shadecode Student — Cortex Devlog

Autonomous improvement log maintained by Cortex Engine.

---

## 2026-09-01 — Master roadmap synchronization and learning-evidence audit

This cycle reconciles the product roadmap with the repository's actual state before expanding the feature surface. The master roadmap now explicitly covers the full Shadecode learning operating system, while Discovery, Student and Campus remain experience boundaries rather than the entire roadmap.

**Verified this cycle:**
- [HIGH] Documentation baseline is synchronized around the master roadmap, platform boundaries, canonical learning events, offline sync contract, product vision and current project status.
- [HIGH] Canonical learning-event delivery is confirmed as local-first and queue-backed. The browser emitter posts to `/api/intelligence/events`, queues failures/offline events locally, deduplicates queued source/sourceEventId pairs, and flushes on reconnect.
- [HIGH] Learn currently emits lesson-view evidence from the lesson launcher. The canonical helper also exposes lesson-completion, exam, and question-attempt event builders, but repository search shows some builders are not yet wired to real product actions. This is an integration gap, not a reason to create another event system.
- [HIGH] Exam Simulation currently emits exam-completion evidence from the finished-result boundary. Question-attempt evidence still needs to be attached to the actual answer/submission path so Cortex receives question-level evidence rather than only aggregate results.
- [HIGH] Mastery semantics remain intentionally blocked from broadening until the local Cortex learning-state heuristic, exam `blendMastery` logic and durable `topic_mastery` RPC update path are reconciled. Multiple competing mastery algorithms must not be allowed to fight over the learner state.
- [MEDIUM] Primary remains the next experience slice, but it must use the same canonical evidence → local persistence → mastery → Cortex recommendation spine rather than introducing a Primary-only intelligence contract.

**Next engineering gate:** wire real learner actions to canonical events, reconcile one authoritative mastery calculation path, audit the live revision/sync protocol, then add authenticated/offline/replay verification before expanding the Primary vertical slice.

---

## 2026-08-29 — Hardening pass: Project Studio, curriculum coverage, canonical events

This pass deliberately continued from the repository's current truth instead of opening another large feature branch. The main product foundations are already present, so the useful work was to remove small correctness hazards and make the remaining boundaries explicit.

**Improvements this cycle:**
- [HIGH] Hardened Project Studio recovery snapshot pruning. An IndexedDB transaction abort is now treated as a failure rather than a successful cleanup, making recovery behavior safer without changing the existing rolling snapshot policy.
- [HIGH] Hardened canonical learning-event normalization. Invalid timestamps are now rejected instead of being silently converted to `1970-01-01`, which could manufacture misleading chronology in downstream learning evidence.
- [HIGH] Added a regression test for malformed learning-event timestamps while retaining the existing replay and cross-user identity guarantees.
- [MEDIUM] Hardened curriculum coverage calculations. Completion counts now intersect completed IDs with the active curriculum catalog, and weak/strong topic signals are similarly scoped to real catalog topics. This prevents stale or unrelated progress records from inflating curriculum coverage.
- [MEDIUM] Added regression coverage for catalog-scoped coverage and prerequisite-aware study ordering.
- [MEDIUM] Updated the canonical learning-event architecture document to record the real production boundary: the existing `learning_events` table predates the normalized contract and must not be reused blindly as a canonical store.
- [MEDIUM] Updated Project Studio finish-line documentation and the current project-status document so shipped foundations are not confused with end-to-end completion gates.

**Important boundary preserved:** no duplicate project model, event schema, mastery system, or curriculum engine was created. The remaining work is integration and verification, not another parallel implementation.

---

## 2026-08-29 — Product truth and release documentation

Refreshed the public product positioning and release documentation around the actual current surface: Cortex, Learn, Exam Simulation, Exam Hub, Math Checker, Project Studio, study organisation, gamification and local-first foundations. Strategic capabilities remain explicitly staged as foundations, in-progress work or research rather than being marketed as finished.

---

## Historical entries

Earlier Cortex cycles remain below this line as the audit trail. Do not delete them when adding future entries.

