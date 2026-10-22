# Shadecode Architecture & Reliability Audit

**Checkpoint:** 2026-10-22  
**Status:** Initial source-of-truth review; implementation verification still required  
**Scope:** Shadecode Student, Cortex, canonical learning evidence, curriculum/mastery, offline reliability, and progressive product integration.

## Purpose

Convert the Shadecode ecosystem direction into an engineering sequence that improves reliability before adding more intelligence. This document distinguishes repository-documented architecture from behaviour that still needs source-code, database, test, and browser verification.

## Source documents reviewed

- `docs/MASTER_SHADECODE_ROADMAP_2026-09-01.md`
- `docs/PROJECT_STATUS_2026-08-29.md`
- `docs/CAPABILITY_REGISTRY.md`
- `docs/cortex-os.md`
- `docs/STRATEGY_CORTEX_NOVA.md`
- `README.md`
- `package.json`

These documents are useful architecture evidence, but they are not proof that every documented capability currently works in production. A source-code audit, live database inspection, test run, and browser verification are still required before upgrading any status.

## Current architecture baseline documented by the repository

1. **Canonical event spine:** product action → canonical normalization → authenticated persistence in `public.cortex_events` → observation/mastery state → intervention → measured outcome.
2. **Mastery storage:** the existing `topic_mastery` store remains authoritative. Do not create a parallel mastery table or a second mastery-scoring algorithm.
3. **Deterministic learning state:** a richer reducer and shared score transition are documented. Durable projection, idempotency at consumer boundaries, and coverage across evidence producers remain verification priorities.
4. **Offline queue:** account-scoped queued events and reconnect flushing are documented. Offline resume, replay, revision conflicts, and cross-device reconciliation need end-to-end evidence.
5. **Product maturity:** Learn is partial; Exam Simulation is marked for reliability work; Discovery's first activity needs end-to-end verification; Campus is a foundation rather than a finished product.
6. **Model routing:** provider routing exists, but local/cloud routing policy and local-model claims must remain evidence-driven.
7. **Test commands:** `npm run verify` runs typecheck, lint, and unit tests; `npm run build` and the existing Playwright commands provide further gates. No test result is asserted by this document.

## Non-negotiable engineering rules

- Reuse existing canonical events, observation adapters, shared mastery transitions, and `topic_mastery`.
- Never infer mastery from lesson views, aggregate-only completions, or activity volume alone.
- Treat missing evidence as **insufficient evidence**, not as low mastery or zero mastery.
- Keep curriculum truth separate from a learner's observed state.
- Make evidence consumers idempotent; replaying the same canonical event must not inflate mastery.
- Keep core scoring, prerequisites, scheduling, and state transitions deterministic where possible.
- Preserve offline progress and show clear pending/synced/failed states.
- Do not claim a capability is shipped until source, tests, and end-to-end behaviour support the claim.
- Keep subject visibility and access aligned with the learner's enrolled/selected subjects and authorized curriculum context.
- Update the capability registry and master roadmap when a capability's implementation or release state materially changes.

## First vertical slice: Syllabus Mastery Heatmap

The next feature slice should be a tested, read-only view built from existing curriculum and mastery sources, not a new learning-state system.

### Required state distinctions

Every syllabus topic shown to a learner must resolve to one of these display states:

- **Insufficient evidence:** no eligible, topic-linked learning evidence is available.
- **Developing:** eligible evidence exists, but the current mastery projection is below the configured proficiency threshold.
- **Secure:** eligible evidence meets the configured proficiency threshold and minimum evidence requirements.
- **Needs review / stale evidence:** evidence exists but is old enough to warrant a refresh, only when a documented and tested staleness rule exists.
- **Unavailable / not in this curriculum:** the topic is not part of the learner's active syllabus or cannot be mapped reliably. Do not silently substitute another syllabus.

The UI must not render a topic with no evidence as 0% mastery. If the current data contract cannot support one of these distinctions reliably, the UI should say so rather than inventing a score.

### Data and calculation contract

1. Obtain the active subject and syllabus from the existing learner/curriculum context.
2. Read the authoritative syllabus topic catalogue and `topic_mastery` projection through the existing authorized data path.
3. Use the existing shared mastery semantics; do not calculate a competing score in the component.
4. Join by stable topic identifiers, not display labels or case-insensitive text guesses.
5. Treat unmapped evidence as unmapped. Do not attach it to a similarly named topic.
6. Separate evidence count/recency from mastery score so users can understand why a state was assigned.
7. Keep the heatmap read-only. It must not create mastery records or mutate learning state merely because it was viewed.
8. Enforce server-side authorization and subject/curriculum scope. Client filtering alone is not an access-control boundary.

### Minimum tests before release

- Topic with no evidence renders **Insufficient evidence**, not 0% mastery.
- Topic with eligible evidence uses the existing authoritative mastery value.
- Duplicate/replayed event evidence does not inflate mastery.
- Evidence mapped to one syllabus cannot leak into another syllabus or subject.
- Topics outside the active curriculum are not shown as available syllabus topics.
- A missing or failed mastery query produces an explicit recoverable state, not fabricated defaults.
- The UI remains usable for a large syllabus and on narrow/mobile screens.
- Existing Learn, Exam Simulation, and offline queue behaviour does not regress.

### Acceptance gate

Do not mark the heatmap shipped until the source integration, unit tests, typecheck/lint, production build, authorized-user browser check, and no-evidence/replay scenarios pass. Record which checks actually ran and their outcomes.

## Audit execution order

### A. Evidence and mastery integrity
- Trace canonical event ingress through normalization, durable persistence, observation adapters, and each mastery consumer.
- Verify which event types are mastery-bearing versus analytics-only.
- Verify evidence identity and replay/idempotency at every consumer boundary.
- Confirm the single authoritative mastery transition and the treatment of the initial placeholder state.

### B. Curriculum integrity and heatmap
- Trace subject selection, active syllabus, stable topic IDs, topic access rules, and mastery reads.
- Implement the heatmap as a read-only projection over existing contracts.
- Add explicit insufficient-evidence and recoverable-error states.

### C. Offline and sync reliability
- Trace queue persistence, active-account ownership, reconnect flushing, revisions, conflict handling, and retry bounds.
- Verify offline resume and reconnect behaviour in a browser, including duplicate replay and sign-out/account-switch boundaries.

### D. Existing learning workflows
- Verify Learn generation completion, saved lesson durability, and recoverability after interrupted requests.
- Verify Exam Simulation start → answer → submit → result → canonical evidence → mastery projection.
- Verify Discovery's My Day → activity → attempt → feedback → event → mastery → next-activity loop.

### E. Documentation and release truth
- Update `docs/CAPABILITY_REGISTRY.md` and the master roadmap in the same engineering workstream as implementation changes.
- Record exact commands, results, deployment identifiers, and browser evidence.
- Never describe a documentation-only change as a product implementation.

## Initial finding and limitation

The reviewed documents consistently identify the canonical evidence spine, mastery reconciliation, offline verification, and Exam Simulation reliability as the highest-value dependencies. They also describe several capabilities as foundations or in progress.

At this checkpoint, the repository's documentation has been reviewed, but the relevant implementation files, live database state, CI results, and production browser flows have not yet been verified in this audit. Accordingly, no feature is upgraded to shipped status here.

## Next engineering action

Inspect the actual source paths for the canonical event bridge, observation adapter, mastery reducer/consumer, curriculum catalogue, and subject-scoped UI. Then implement the smallest testable vertical slice without introducing duplicate state or changing unrelated access behaviour.


## Source-level trace performed after the initial checkpoint

The following source files were inspected on the default branch before applying the proposed compatibility fix:

- `src/app/api/intelligence/events/route.ts`
- `src/lib/intelligence/learningEvents.ts`
- `src/lib/intelligence/learningObservation.ts`
- `src/lib/cortex/learningState.ts`
- `src/lib/intelligence/masteryTransition.ts`
- `src/lib/intelligence/projectLearningEvent.ts`

### Confirmed from source

- Event ingress authenticates through Supabase server auth, normalizes a supported event, and persists through `insert_canonical_cortex_event`.
- The ingress attempts the mastery projection after persistence and returns HTTP 202 with `projectionPending` if projection throws. The event can therefore be durably accepted while the projection remains pending.
- The observation adapter ignores events without an explicit topic and excludes events marked `aggregateOnly`.
- The shared mastery transition uses a documented 70/30 historical/evidence EMA heuristic. The source explicitly says this is not a validated psychometric model.
- The projection uses a unique marker keyed from the canonical event ID to avoid processing the same event twice.
- The projection reads `attempts` and the richer `exposure` field from `topic_mastery`. Before the fix below, its state adapter defaulted a missing/zero exposure to zero even when an older row already had recorded attempts.

### Compatibility issue corrected in this branch

A legacy `topic_mastery` row can have a positive `attempts` count while `exposure` is absent or still zero. The reducer interprets `exposure === 0` as “no prior evidence” and sets mastery to the latest evidence score. That could overwrite the established mastery baseline instead of blending the new observation with prior history.

The branch now initializes the reducer's exposure from the stored attempt count when the richer exposure value is zero/missing. This is a narrow compatibility safeguard; it does not add a new table or scoring algorithm.

**Verification status:** the source change has been committed to this PR branch, but automated tests, typecheck, lint, build, database replay, and browser checks have not been run from this connector. Do not merge or call the fix verified until those gates pass. A focused regression test should cover a legacy row with `attempts > 0` and `exposure = 0/null`, asserting that the next observation uses the historical 70/30 transition rather than resetting mastery to the latest evidence.
