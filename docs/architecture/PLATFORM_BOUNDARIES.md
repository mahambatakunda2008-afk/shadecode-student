# Shadecode Platform Boundaries

Status: proposed foundation contract
Date: 2026-09-01

## Purpose

Shadecode is intended to become three specialized learning experiences backed by one shared platform:

- **Discovery**: Primary, curiosity, play, foundations
- **Student**: Secondary, ZIMSEC/Cambridge, mastery, exams, independence
- **Campus**: University, Polytechnic and TVET, projects, research, skills and careers
- **Cortex OS**: shared intelligence underneath all three

The current repository remains one application. This document defines ownership boundaries so the codebase can evolve without cloning the product or creating parallel learning systems.

## Shared platform owns

- learner identity and education context
- curriculum and curriculum mapping
- activity/question definitions
- attempts and evidence
- canonical learning events
- mastery/learning state
- learner memory and knowledge graph
- offline local persistence and sync
- learning packs
- Cortex orchestration and provider routing
- safety and privacy primitives

## Discovery owns

- Primary-specific navigation and visual language
- age-appropriate wording and interaction patterns
- story, phonics, foundational literacy and numeracy experiences
- primary science exploration
- child-safe rewards and collections
- parent/teacher companion surfaces for Primary

Discovery must consume shared evidence/mastery contracts. It must not create a second scoring, event or mastery pipeline.

## Student owns

- Secondary and Cambridge/ZIMSEC study workflows
- exam preparation and simulation UX
- past-paper workflows
- revision planning and exam analytics
- student-facing mastery and performance experiences

Student remains the current production surface and must not be destabilized by the future product split.

## Campus owns

- institution/programme/year/semester structure
- course/module workflows
- coursework and assignments
- research workflows
- projects and portfolios
- university/TVET assessment context
- careers, scholarships, internships and professional opportunities

Campus must not assume school-exam-only data models.

## Current codebase finding: learning-event naming collision

The repository currently contains two modules named `learningEvents.ts`:

- `src/lib/intelligence/learningEvents.ts` is the canonical product-event normalization/idempotency layer. It defines `LearningEventKind`, `LearningEvent`, source-event normalization and canonical event IDs.
- `src/lib/cortex/learningEvents.ts` is a narrower Cortex/SLS adapter. It defines a different `LearningEvent` shape and converts events into `LearningObservation` values for learning-state updates.

These are not currently identical systems, but the shared filename and exported type name create a significant architectural ambiguity for future Discovery/Campus work.

### Boundary decision

1. `src/lib/intelligence/learningEvents.ts` remains the canonical cross-product learning-event ingress/normalization contract.
2. `src/lib/cortex/learningEvents.ts` is treated as a Cortex learning-observation adapter, not a second canonical event system.
3. New product surfaces must emit canonical intelligence events and then derive observations/mastery from that pipeline.
4. Future refactoring should rename the Cortex adapter to make the distinction explicit, but only after import/test coverage is mapped. Do not perform a blind rename.
5. No new feature may introduce another `LearningEvent` contract with overlapping semantics.

## Required evidence flow

```text
Discovery / Student / Campus action
        -> canonical LearningEvent
        -> local-first persistence / sync
        -> observation + mastery state
        -> Cortex context
        -> next learning recommendation
```

Core learning actions must remain usable offline. Network AI may enrich recommendations, but it must not become authoritative for completion, scoring or persistence.

## Migration rule

Extract shared contracts only when they are genuinely shared. Do not create empty abstraction folders or speculative micro-packages. Prefer small, tested boundaries over a premature monorepo split.
