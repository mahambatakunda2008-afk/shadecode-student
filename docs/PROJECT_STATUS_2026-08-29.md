# Shadecode Student Project Status — 2026-08-29

## Release posture

The repository is in an active hardening phase. Major product foundations are merged, but the strategic roadmap is not being represented as finished when only foundations exist.

## Completed / materially shipped

- Project Studio staged workflow with learner-owned evidence capture.
- Project integrity checks and recovery support.
- Project document/outline assembly.
- Academic-stage experience surfaces across the supported learner journey.
- Canonical academic profile foundation.
- Shared StudySpace/Canvas foundations already present in the repository.
- Local-first synchronization primitives and offline foundations.
- Canonical learning-event normalization foundation with stable, user-scoped identities.
- Deterministic replay/idempotency tests for the canonical event contract.
- Public landing page refreshed to match the actual product direction and avoid fabricated learner metrics.

## In progress

### 1. Cortex event integration

The canonical event contract now exists. The next step is migrating real product emitters onto it, then persisting idempotency keys server-side and feeding supported events into the existing Student Intelligence layer.

### 2. Learning Experience v2

The next layer is deeper curriculum coverage, structured diagrams, shared Question Forge, source provenance, Library workflows, Concept Atlas, Mistake Museum, Paper Intelligence and Learning Replay.

### 3. Canvas and shared tooling

Complete the intelligent/reversible geometry assistance, shared-canvas adoption and calculator/tool end-to-end verification. Release only after browser smoke checks and deterministic tests pass.

### 4. Local-first synchronization

Continue entity migration, revision/version semantics and safe hydration. XP must become an append-only event ledger before more aggressive offline reconciliation is enabled.

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
