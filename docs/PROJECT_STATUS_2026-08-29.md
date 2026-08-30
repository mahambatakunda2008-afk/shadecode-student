# Shadecode Student Project Status — 2026-08-30

## Release posture

The repository is in an active hardening and integration phase. Major product foundations are merged, but the strategic roadmap is not represented as finished when only foundations exist.

## Completed / materially shipped

- Project Studio staged workflow with learner-owned evidence capture.
- Project Studio now captures the complete project intake: teacher brief, deliverable, required sections/rubric, constraints, materials, physical work, digital work, output format and preferred assistance level.
- Project Studio creates and surfaces a work-ready plan that separates digital preparation from physical learner-owned work.
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
- Project Studio workspace progress now reports stage progress using the active stage position, including the first stage.
- Offline mutation queue coalesces pending mutations for the same authenticated user, store and entity instead of accumulating stale writes while offline.
- Canonical learning-event API ingress authenticates the user server-side and persists normalized events into the durable Cortex event store.
- Durable Cortex event storage has a unique canonical-event identity index for safe replay/idempotency.
- Learn emits `lesson.viewed` through the canonical event ingress without blocking lesson navigation.
- Task completion emits `task.completed` through the canonical event pipeline.
- Shared server-side Cortex event bridge added for authenticated product mutations.
- Assessment ingestion hardened for PDF line boundaries, provenance and subpart-aware extraction.
- Project Studio event helpers added for evidence and stage lifecycle events.
- Exam Simulation now emits `exam.completed` through the canonical event ingress.
- Client Cortex events now persist in a bounded local queue while offline or when a request fails, then flush automatically when connectivity returns.
- The authenticated app shell installs the Cortex reconnect flusher globally, so queued events do not depend on the learner revisiting the originating module.

## In progress

### 1. Project work execution

Project Studio now has enough structured intake to stop treating every project as a generic six-stage checklist. The next execution layer should route the intake to the appropriate builder: report/document, research pack, presentation, software/code, model/prototype instructions, calculations/diagrams or mixed deliverables. AI may prepare legitimate digital artefacts and drafts quickly, but must never fabricate physical evidence or claim that unperformed work happened.

### 2. Cortex event integration

The durable canonical event contract is implemented. Learn, task completion and Exam completion now emit real events, while Project Studio and the remaining Exam lifecycle events need final browser-level validation. Downstream Student Intelligence consumers still need end-to-end validation against real event data.

### 3. Learning Experience v2

The next layer is deeper curriculum coverage, structured diagrams, shared Question Forge, source provenance, Library workflows, Concept Atlas, Mistake Museum, Paper Intelligence and Learning Replay.

### 4. Canvas and shared tooling

Complete intelligent/reversible geometry assistance, shared-canvas adoption and calculator/tool end-to-end verification. Release only after browser smoke checks and deterministic tests pass.

### 5. Local-first synchronization

The shared queue is bounded and coalesces duplicate pending entity writes. Cortex telemetry now has its own bounded reconnect-safe queue. Remaining work is authenticated reconnect verification, revision/version semantics and safe hydration for every major entity type.

### 6. Project Studio completion gate

The product surface is materially built. The remaining finish-line work is verification of offline browser behavior, authenticated reconnect/synchronization, duplicate/replay behavior, generated-artefact persistence and clear sync state in the UI.

## Academic integrity boundary

Project Studio is designed around a useful distinction:

**AI can do:** research organization, outlines, calculations, explanations, code, diagrams, draft reports, presentation structure, checklists, model specifications, templates and other digital/scaffolding work where the assignment permits it.

**The learner must still do:** real interviews, field observations, measurements, experiments, physical construction, attendance/signatures, teacher verification and any other evidence that requires a real-world action.

The system should label generated material as generated/draft/scaffolding and keep learner evidence separately attributable.

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
