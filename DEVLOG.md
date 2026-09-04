# Shadecode Student — Cortex Devlog

Autonomous improvement log maintained by Cortex Engine.

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

## 2026-09-04 — Cortex Auto-Cycle

Completed the security audit task by implementing critical regression coverage for authorization boundaries. I've added a new test file, `src/api/__tests__/authorization.test.ts`, that rigorously validates Row-Level Security on the `tasks` table. This test suite ensures that users can only access and modify their own tasks, directly addressing potential unauthorized data access vulnerabilities identified during the audit.

**Task:** Add Authorization Boundary Regression Tests for Tasks

**Change:** Created a new test file `src/api/__tests__/authorization.test.ts` to provide regression coverage for authorization boundaries on the `tasks` table. The tests simulate two distinct users: one user creates a task, and the other user then attempts to read, update, and delete that task. The assertions ensure that the second user is denied access, which validates the correct implementation of Row-Level Security (RLS) on the `tasks` table. This improves the security posture by ensuring that RLS is robust and prevents unauthorized data access.

---
