# Shadecode Student Project Status — 2026-08-30

## Release posture

The repository is in an active hardening and integration phase. Major product foundations are merged, but the strategic roadmap is not represented as finished when only foundations exist.

## Completed / materially shipped

- Project Studio staged workflow with learner-owned evidence capture.
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

### 1. Cortex event integration

The durable canonical event contract is implemented. Learn, task completion and Exam completion now emit real events, while Project Studio and the remaining Exam lifecycle events need final browser-level validation. Downstream Student Intelligence consumers still need end-to-end validation against real event data.

### 2. Learning Experience v2

The next layer is deeper curriculum coverage, structured diagrams, shared Question Forge, source provenance, Library workflows, Concept Atlas, Mistake Museum, Paper Intelligence and Learning Replay.

### 3. Canvas and shared tooling

Complete intelligent/reversible geometry assistance, shared-canvas adoption and calculator/tool end-to-end verification. Release only after browser smoke checks and deterministic tests pass.

### 4. Local-first synchronization

The shared queue is bounded and coalesces duplicate pending entity writes. Cortex telemetry now has its own bounded reconnect-safe queue. Remaining work is authenticated reconnect verification, revision/version semantics and safe hydration for every major entity type.

### 5. Project Studio completion gate

The product surface is materially built. The remaining finish-line work is verification of offline browser behavior, authenticated reconnect/synchronization, duplicate/replay behavior and clear sync state in the UI.

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