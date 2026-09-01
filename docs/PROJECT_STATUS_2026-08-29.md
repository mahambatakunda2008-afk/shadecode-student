# Shadecode Student Project Status — 2026-09-01

## Release posture

The repository is in an active hardening and integration phase. Major product foundations are merged, but the strategic roadmap is not represented as finished when only foundations exist.

**Authoritative master scope:** `docs/MASTER_SHADECODE_ROADMAP_2026-09-01.md` tracks the complete Shadecode scope across Cortex, Learning, Assessment, Creation, Engagement, Primary, Student, Campus, Teacher/School, Parent, Knowledge, Offline/Local-first, Trust/Platform and Business. This status file records current engineering/release posture; the master roadmap is the broader feature matrix.

## Completed / materially shipped

- Project Studio staged workflow with learner-owned evidence capture.
- Project Studio captures teacher brief, deliverable, required sections/rubric, constraints, materials, physical work, digital work, output format and assistance level.
- Project Studio builds a deterministic first-pass production plan at project creation and can rebuild it after requirements change.
- Subject/project signals route production planning toward science, fieldwork, software, design/prototype, commerce and general deliverables.
- Project Studio has an executable worker-plan layer that turns the production plan into typed tasks with inputs, outputs, learner-evidence requirements and blockers.
- Project Worker now executes ready tasks into editable, explicitly generated scaffolds for research packs, reports, presentations, software specifications, model/prototype specifications and calculation workspaces.
- Project artifacts carry explicit provenance. Generated drafts cannot be promoted to real-world evidence; learner evidence and teacher-provided evidence remain attributable.
- Project Studio can assemble a submission-pack readiness view showing missing brief/deliverable/rubric/evidence before final packaging.
- Worker planning explicitly blocks tasks that depend on real-world observations, measurements, interviews, responses, construction or testing until attributable learner evidence exists.
- Project integrity checks and recovery support.
- Project document/outline assembly.
- Academic-stage experience surfaces across the supported learner journey.
- Canonical academic profile foundation.
- Shared StudySpace/Canvas foundations.
- Local-first synchronization primitives and offline foundations.
- Canonical learning-event normalization with stable, user-scoped 128-bit identities.
- Deterministic replay/idempotency tests for the canonical event contract.
- Public landing page refreshed to match the actual product direction and avoid fabricated learner metrics.
- Curriculum coverage analysis hardened so completion counts are derived from the active catalog rather than raw/stale progress IDs.
- Project recovery transaction handling hardened so aborted snapshot-pruning transactions are surfaced rather than treated as successful cleanup.
- Project Studio workspace progress reports stage progress using the active stage position, including the first stage.
- Offline mutation queue coalesces pending mutations for the same authenticated user, store and entity instead of accumulating stale writes while offline.
- Canonical learning-event API ingress authenticates the user server-side and persists normalized events into the durable Cortex event store.
- Durable Cortex event storage has a unique canonical-event identity index for safe replay/idempotency.
- Learn emits `lesson.viewed` through the canonical event ingress without blocking lesson navigation.
- Task completion emits `task.completed` through the canonical event pipeline.
- Shared server-side Cortex event bridge added for authenticated product mutations.
- Assessment ingestion hardened for PDF line boundaries, provenance and subpart-aware extraction.
- Project Studio event helpers added for evidence and stage lifecycle events.
- Exam Simulation emits `exam.completed` through the canonical event ingress.
- Client Cortex events persist in a bounded local queue while offline or when a request fails, then flush automatically when connectivity returns.
- Authenticated app shell installs the Cortex reconnect flusher globally.
- Richer durable `topic_mastery` learning-state fields added for retention, confidence, stability, exposure, error rate, response speed, prerequisite health, recent improvement and uncertainty.
- Canonical Cortex event persistence is idempotent and can apply supported learning evidence to the existing `topic_mastery` store without creating a second mastery table.
- Canonical learning-event architecture documentation reconciled with the durable production implementation.
- Master Shadecode roadmap/status matrix created to preserve the complete product scope discussed on 2026-09-01.

## In progress

### 1. Cortex event integration

The durable canonical event contract is implemented. Learn, task completion and Exam completion emit real events. Project Studio and remaining Exam lifecycle events need final browser-level validation. Downstream Student Intelligence consumers still need end-to-end validation against real event data.

### 2. Mastery semantics reconciliation

The local `updateLearningState()` engine, existing `blendMastery` semantics and durable `topic_mastery` update path must be reconciled before broadening event-driven mastery updates. Avoid parallel mathematical definitions of mastery.

### 3. Local-first synchronization

The shared queue is bounded and coalesces duplicate pending entity writes. Cortex telemetry has its own bounded reconnect-safe queue. The live database also has sync-revision protocol history that requires an explicit audit. Remaining work is authenticated reconnect verification, revision/version semantics and safe hydration for every major entity type.

### 4. Learning Experience v2

The next layer is deeper curriculum coverage, structured diagrams, shared Question Forge, source provenance, Library workflows, Concept Atlas, Mistake Museum, Paper Intelligence and Learning Replay.

### 5. Canvas and shared tooling

Complete intelligent/reversible geometry assistance, shared-canvas adoption and calculator/tool end-to-end verification. Release only after browser smoke checks and deterministic tests pass.

### 6. Project Studio completion gate

The remaining finish-line work is verification of offline browser behavior, authenticated reconnect/synchronization, duplicate/replay behavior, generated-artifact persistence, worker execution quality and clear sync state in the UI.

### 7. Primary / Campus / people surfaces

Primary Discovery, Campus/TVET, Teacher/School and Parent capabilities are being treated as shared-platform consumers, not separate cloned systems. The first Primary activity must use the canonical learning evidence spine.

## Academic integrity boundary

**AI can:** organize research, create outlines, calculations, explanations, code, diagrams, draft reports, presentation structure, checklists, model specifications, templates and other permitted digital/scaffolding work.

**The learner must still do:** real interviews, field observations, measurements, experiments, physical construction, attendance/signatures, teacher verification and any other evidence that requires a real-world action.

Generated material must be labelled as generated/draft/scaffolding, and learner evidence must remain separately attributable. Worker tasks that require real-world evidence should remain blocked until that evidence is supplied.

## Product direction

The intended Project Studio journey is:

`Teacher brief → requirements → production plan → worker tasks → digital artefacts → physical-work checklist → learner evidence → analysis → document/artefact assembly → rubric check → final submission pack`

The worker should optimize for speed without pretending that real-world work happened. Students should spend less time formatting and organizing and more time doing the parts that genuinely require them.

## Security follow-up

Supabase security advisors still report pre-existing warnings, including several callable `SECURITY DEFINER` functions and disabled leaked-password protection. The new canonical event persistence function is intentionally `SECURITY INVOKER`, validates the authenticated user, and has no public execute grant. Existing warnings should be remediated separately without changing unrelated authorization behavior blindly.

## Explicitly deferred

ShadeNet peer resource exchange remains downstream of reliable single-device offline behaviour and authenticated cloud synchronization. It is not an MVP dependency.

Large learner-model or "digital twin" claims remain research direction until the evidence foundation is mature.

## Product truthfulness rule

The landing page and documentation should distinguish:

- **available:** implemented and usable;
- **foundation:** implemented infrastructure that is not yet the complete end-user capability;
- **in progress:** actively being integrated;
- **research:** plausible future direction, not a shipped feature.

This classification should be preserved in future documentation and marketing copy.

## Verification gate

Before calling a major slice complete:

```text
lint → typecheck → unit tests → production build → browser smoke → inspect deployment → update docs
```

No green build is considered sufficient evidence that a learning flow works end-to-end.
