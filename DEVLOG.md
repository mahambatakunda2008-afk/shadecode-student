# Shadecode Student — Cortex Devlog

Autonomous improvement log maintained by Cortex Engine.

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
+
**Boundary:** this is the first authoritative durable richer-state projection consumer, not the end of the migration. Other evidence-bearing surfaces still need explicit semantics and idempotent integration before they can write the richer state.

---

## 2026-09-02 — Discovery run identity and evidence double-count protection

The first Discovery activity exposed two future evidence-integrity hazards before they could become production debt.

**Fixed:**
+- [HIGH] Number Explorer now persists a unique `activityInstanceId` for each run. Replaying the activity after completion creates a new instance instead of reusing canonical event identities from an earlier run.
+- [HIGH] Question-attempt and completion source event IDs are scoped to the activity instance, preserving durable idempotency while allowing legitimate repeated practice.
+- [HIGH] Aggregate completion events can now be marked `aggregateOnly` and the observation adapter explicitly excludes them from mastery evidence. This prevents question-level evidence plus aggregate completion from silently becoming two mastery transitions later.
+- [MEDIUM] Added regression coverage for the aggregate-only observation boundary.

**Result:** Discovery now has a cleaner evidence contract before the richer server-side projection is enabled.

---

## 2026-09-01 — Account-scoped offline learning-event queue

A final offline audit found a subtle but important identity problem: the previous browser event queue stored source events without an account owner. A queued event could therefore survive an account switch and potentially be delivered under the next authenticated session.

**Fixed:**
+- [HIGH] Bumped the learning-event queue to `v2` and store an explicit owner identity alongside every queued event.
+- [HIGH] Queue flushing now requires the remembered active learner ID and only sends events owned by that learner.
+- [HIGH] Events from another account remain isolated instead of being uploaded under the current session.
+- [HIGH] Events cannot be queued offline when there is no remembered learner identity, avoiding anonymous evidence that could later be misattributed.
+- [MEDIUM] Existing v1 queue data is intentionally not migrated because its owner cannot be established safely.

**Security boundary:** the server remains authoritative for authenticated identity. The local owner ID is only a routing/isolation guard and never grants authorization.

---

## Historical entries

Earlier Cortex cycles remain below this line as the audit trail. Do not delete them when adding future entries.
