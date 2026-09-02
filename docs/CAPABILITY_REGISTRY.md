# Shadecode Capability Registry

**Status:** Active engineering registry  
**Strategy:** Build the capability surface aggressively; release it progressively.

## Why this exists

The master roadmap answers **what we want to build**. This registry answers two different questions:

1. **Engineering truth:** what capability, engine, data contract, or infrastructure exists?
2. **Product truth:** when should learners actually see it?

A capability can therefore be built and tested before it is exposed in the default experience. This prevents artificial feature scarcity without turning the product into a cockpit full of unfinished switches.

## Release principle

> **Build the whole machine. Reveal the machine progressively.**

Do not delete or avoid a capability merely because it is not ready for the default UI. Keep the underlying contracts stable, testable, offline-aware, and education-context agnostic where genuinely shared.

## Status legend

- 🟢 SHIPPED: production capability verified and intentionally exposed
- 🟡 PARTIAL: useful implementation exists but important gaps remain
- 🔵 FOUNDATION: architecture/contracts/infrastructure exist
- 🟣 IN DEVELOPMENT: active implementation
- ⚪ PLANNED: defined but not yet implemented
- 🔬 RESEARCH: feasibility/calibration work required
- 🔴 REWORK: existing implementation needs correction before expansion

## Capability matrix

| Capability | Layer | Discovery | Student | Campus | Engineering status | Default release |
|---|---|---:|---:|---:|---|---|
| Learner identity + education context | Platform | ✓ | ✓ | ✓ | 🔵 | All |
| Canonical learning events | Evidence | ✓ | ✓ | ✓ | 🔵 | Invisible |
| Durable idempotent event ingress | Evidence | ✓ | ✓ | ✓ | 🟢 | Invisible |
| Account-scoped offline event queue | Offline | ✓ | ✓ | ✓ | 🟢 | Invisible |
| Local learning state reducer | Cortex | ✓ | ✓ | ✓ | 🔵 | Invisible |
| Shared mastery score transition | Cortex | ✓ | ✓ | ✓ | 🔵 | Invisible |
| Rich learning-state dimensions | Cortex | ✓ | ✓ | ✓ | 🔵 | Progressive |
| Durable richer mastery projection | Cortex/Data | ✓ | ✓ | ✓ | 🟣 | Progressive |
| Knowledge graph | Cortex | ✓ | ✓ | ✓ | ⚪ | Invisible |
| Concept prerequisites | Cortex | ✓ | ✓ | ✓ | ⚪ | Invisible |
| Adaptive difficulty | Cortex | ✓ | ✓ | ✓ | ⚪ | Contextual |
| Weak-area detection | Cortex | ✓ | ✓ | ✓ | 🟡 | Contextual |
| Retention / forgetting radar | Cortex | ✓ | ✓ | ✓ | ⚪ | Contextual |
| Confidence intelligence | Cortex | ✓ | ✓ | ✓ | 🔵 | Contextual |
| Response-speed intelligence | Cortex | ✓ | ✓ | ✓ | 🟡 | Invisible |
| Mistake intelligence | Cortex | ✓ | ✓ | ✓ | 🟡 | Progressive |
| Next-best-action engine | Cortex | ✓ | ✓ | ✓ | ⚪ | Contextual |
| Learner reflection | Cortex | ✓ | ✓ | ✓ | ⚪ | Progressive |
| Learning replay / history | Cortex | ✓ | ✓ | ✓ | ⚪ | Progressive |
| Local AI runtime | Intelligence | ✓ | ✓ | ✓ | 🔬 | Progressive |
| Cloud AI routing/fallbacks | Intelligence | ✓ | ✓ | ✓ | 🟡 | Invisible |
| Offline lessons | Learning | ✓ | ✓ | ✓ | 🟡 | All |
| Offline assessments | Assessment | ✓ | ✓ | ✓ | 🟡 | All |
| Offline projects | Creation | ✓ | ✓ | ✓ | 🟡 | Progressive |
| Sync + revision protocol | Offline | ✓ | ✓ | ✓ | 🟡 | Invisible |
| Primary Number Explorer | Discovery | ✓ | - | - | 🟣 | Now |
| Primary reading/phonics | Discovery | ✓ | - | - | ⚪ | Progressive |
| Primary mental maths | Discovery | ✓ | - | - | ⚪ | Progressive |
| Primary science experiences | Discovery | ✓ | - | - | ⚪ | Progressive |
| Primary local-language learning | Discovery | ✓ | - | - | ⚪ | Progressive |
| Child-safe rewards/collections | Discovery | ✓ | - | - | 🟡 | Progressive |
| Cambridge/ZIMSEC curriculum | Student | - | ✓ | - | 🟡 | Now |
| Learn experience | Student | - | ✓ | - | 🟡 | Now |
| Exam Simulation | Student | - | ✓ | - | 🟡 | Now |
| Past-paper intelligence | Student | - | ✓ | - | 🟣 | Progressive |
| Question Forge | Assessment | - | ✓ | ✓ | ⚪ | Progressive |
| Exam Intelligence | Assessment | - | ✓ | ✓ | 🟡 | Progressive |
| Personalized revision | Learning | - | ✓ | ✓ | ⚪ | Contextual |
| Project Studio | Creation | - | ✓ | ✓ | 🟡 | Progressive |
| Research Vault | Creation | - | ✓ | ✓ | ⚪ | Campus-first |
| Evidence/provenance | Trust | - | ✓ | ✓ | 🟡 | Invisible |
| Portfolio | Creation | - | ✓ | ✓ | ⚪ | Progressive |
| University programmes/modules | Campus | - | - | ✓ | ⚪ | Campus |
| Coursework/assignments | Campus | - | - | ✓ | ⚪ | Campus |
| Research/projects | Campus | - | - | ✓ | ⚪ | Campus |
| TVET/polytechnic workflows | Campus | - | - | ✓ | ⚪ | Campus |
| Skills/internships/careers | Campus | - | - | ✓ | ⚪ | Campus |
| Teacher intelligence | School | ✓ | ✓ | ✓ | ⚪ | Later |
| Parent companion | School | ✓ | ✓ | - | ⚪ | Later |
| School intelligence | School | ✓ | ✓ | ✓ | ⚪ | Later |
| Multilingual/local-language UX | Experience | ✓ | ✓ | ✓ | ⚪ | Progressive |
| Accessibility layer | Trust | ✓ | ✓ | ✓ | 🟡 | All |
| Child safety/privacy controls | Trust | ✓ | ✓ | ✓ | 🟡 | All |
| PWA/mobile packaging | Runtime | ✓ | ✓ | ✓ | 🟡 | All |
| Desktop/native packaging | Runtime | ✓ | ✓ | ✓ | 🟡 | Progressive |

## Architecture rules

### 1. Shared means genuinely shared

Extract a capability into the shared platform only when its data contract and lifecycle are genuinely common. Do not create speculative micro-packages or empty abstractions merely because three experiences exist.

### 2. UI is not the capability

A capability can be implemented without being visible. For example, retention intelligence may exist in Cortex while the learner only receives a contextual “quick refresh” intervention.

### 3. Offline is authoritative for learning mechanics

Completion, scoring, local state, and core learning interactions must remain usable without a network. Network AI enriches the experience but does not become the source of truth for whether an offline learning action happened.

### 4. One evidence spine

Product action → canonical learning event → durable/local-first persistence → observation/reducer → learning state → Cortex decision → next action.

Do not create parallel learning-event contracts for individual experiences.

### 5. One authoritative state transition

There must be one authoritative richer-state reducer. Compatibility projections may exist, but they must not invent a second scoring algorithm.

### 6. Progressive release is deliberate

A capability may be marked **built** while its release remains **hidden**, **contextual**, or **progressive**. Release gating belongs to product experience logic, not duplicated capability implementations.

## Build order from here

1. Harden the shared platform spine.
2. Finish authoritative richer-state persistence/projection.
3. Audit offline sync coverage and replay/conflict semantics.
4. Verify Learn, Exam Simulation, Project Studio, and Discovery against the same evidence spine.
5. Expand Discovery into a complete foundational-learning loop.
6. Expand Student assessment and past-paper intelligence.
7. Build Campus capabilities against the already-stable shared contracts.
8. Add local AI and compressed-device intelligence behind the same Cortex interfaces.
9. Only then broaden default exposure aggressively, using progressive capability flags and contextual UX.

## Definition of capability-complete

Shadecode is **capability-complete for a domain** when the platform has a coherent underlying answer for the major learning problems in that domain, even if some experiences remain hidden or progressive.

Capability-complete does **not** mean feature-complete UI. It means future product improvements can mostly be delivered by better content, calibration, orchestration, and experience rather than repeatedly rebuilding the platform spine.

## Change discipline

Every meaningful capability change should update this registry and the master roadmap in the same engineering pass. If implementation and release status differ, record both rather than forcing one status to stand in for the other.
