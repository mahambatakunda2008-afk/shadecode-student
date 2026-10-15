# Shadecode Student Strategy-to-Engineering Execution Plan

**Status:** Active execution plan  
**Date:** 2026-10-15  
**Scope:** Translate the Shadecode Student analysis, elite growth, and maintenance/scaling recommendations into verified, incremental engineering work.

## Decision

Use the strategy as an input to the existing Shadecode platform, not as a parallel product specification. Preserve the current product architecture, canonical learning-event contract, established `topic_mastery` store, local-first/offline requirements, and the rule that generative AI is not the source of truth for scores or learner state.

The supplied Google Doc currently points to one document ID across several revisions. Its complete contents could not be independently retrieved in this pass, so this plan uses the feature descriptions supplied with the emails and reconciles them against repository documentation. Update this plan when the full document text is available.

## Verified repository baseline

- The README identifies the canonical learning-event ingress as `POST /api/intelligence/events`, backed by durable, idempotent `public.cortex_events`.
- The canonical event contract and `topic_mastery` remain the existing learning evidence/mastery foundation.
- `docs/architecture/canonical-learning-events.md` states that the event ingress is persistence-only and that mastery transitions must not be independently recomputed by event persistence.
- `docs/MASTER_SHADECODE_ROADMAP_2026-09-01.md` identifies trustworthy learning evidence, mastery semantics, offline persistence/sync, and Learn/Exam Simulation reliability as higher priority than new feature breadth.
- Exam Simulation is explicitly marked for reliability work before expansion.
- The product roadmap already contains weak-area detection, adaptive intervention, Paper Intelligence, question provenance, topic mapping, and exam analytics. New work should extend those foundations rather than create duplicate engines.

## Workstream order

### P0-A. Evidence and mastery integrity

**Goal:** Ensure every mastery/readiness feature is based on real, attributable learner evidence.

1. Map current event producers for Learn, Exam Simulation, quizzes, and mistakes.
2. Audit event identity, idempotency, offline queue/replay, and account isolation.
3. Confirm graded evidence preserves actual score, question/topic identity, timestamp, and source provenance.
4. Confirm one authoritative mastery transition and one richer learning-state reducer remain in use.
5. Add or extend tests before adding consumers. Do not count lesson completion alone as proof of mastery.
6. Do not double-count evidence when migrating compatibility bridges.

**Exit criteria:** Deterministic unit tests plus integration/E2E coverage for authenticated persistence, replay idempotency, offline queuing/reconnect, and at least one real Learn and Exam Simulation learner flow.

### P0-B. Syllabus Mastery Heatmaps

**Goal:** Present the current canonical topic mastery and evidence coverage in a topic-by-topic view.

1. Reuse curriculum/topic identifiers and the existing `topic_mastery` store.
2. Distinguish mastered, developing, weak, unassessed, and insufficient-evidence states. Do not render missing data as zero mastery.
3. Expose evidence count/recency and a clear explanation of why a topic is flagged.
4. Keep authorization and RLS authoritative; scope every read to the authenticated learner.
5. Add a next action that routes to existing Learn, practice, or Exam Hub workflows.
6. Ensure loading, empty, offline, and partial-curriculum states are useful and truthful.

**Exit criteria:** Topic states are derived from stored evidence; unknowns are explicit; topic links resolve to existing curriculum records; account isolation and accessibility are tested.

### P0-C. Exam Readiness Forecasting

**Goal:** Provide a calibrated, transparent estimate from actual evidence, not a confident-looking invented percentage.

1. Start with deterministic calculations using topic mastery, recency, graded timed attempts, and syllabus coverage.
2. Separate observed performance from forecast; display evidence coverage and uncertainty.
3. Return “not enough evidence yet” when the sample is too small or the syllabus mapping is incomplete.
4. Do not claim a validated probability of passing or a predicted grade until calibration data supports that claim.
5. Compare forecasts with later real assessment outcomes and track calibration before stronger claims.
6. Keep AI in the explanation/planning role, never the authoritative numeric calculation.

**Exit criteria:** Pure-function tests cover edge cases, insufficient data, sparse coverage, stale evidence, and strong/weak mixed performance. UI copy accurately describes estimates and limitations.

### P1-A. Adaptive Cognitive Load Governor

**Goal:** Choose a useful next study action using evidence-backed rules.

- Begin with a deterministic policy over recent correctness, repeated mistakes, task duration when available, topic prerequisites, and learner-selected session length.
- Prefer changing one factor at a time: explanation depth, question difficulty, task size, or review timing.
- Treat fatigue and cognitive state as unknown unless the learner explicitly reports them.
- Log recommendation reason and outcome so the policy can be evaluated.
- Keep network/AI failure from blocking basic study and progress persistence.

**Exit criteria:** Explainable decisions, fallback behavior, unit tests, and measurable outcomes; no black-box “mental state” claims.

### P1-B. Autonomous Past-Paper Forensics

**Goal:** Turn verified past papers into traceable assessment intelligence.

- Reuse Exam Hub ingestion and existing paper/question provenance.
- Analyse only material with known source and syllabus mapping; distinguish extracted facts from inferred tags.
- Produce topic coverage, command-word patterns, mark allocations, question structures, and topic combinations.
- Label historical frequency as descriptive, not a guarantee of future exam content.
- Keep human review for low-confidence extraction/mapping and preserve original paper/question references.
- Generate practice only with clear labels separating authentic questions from AI-generated variants.

**Exit criteria:** Provenance preserved end-to-end; extraction/mapping confidence visible; deterministic aggregation tests; no generated prediction presented as official exam knowledge.

### P2. Feynman-Chain Teach-Back and Peer Benchmarking

**Goal:** Help learners explain concepts, identify gaps, and improve explanations.

1. Build individual teach-back and feedback first.
2. Score against explicit curriculum-aligned criteria and cite the missing concept or reasoning step.
3. Treat model feedback as formative and fallible; allow learner correction.
4. Do not expose student explanations or identifiable performance to peers by default.
5. Add opt-in, anonymised cohort comparison only after privacy, minimum cohort size, consent, and abuse controls are designed.

**Exit criteria:** Useful individual workflow without peer data sharing; transparent criteria; privacy review before any cohort comparison.

### P0-D. Reliability and operational maintenance

- Audit lesson-generation and Exam Simulation failure paths, timeout/retry loops, and user-visible recovery.
- Preserve work locally before remote AI calls; avoid repeated progress percentages that imply progress without state change.
- Add structured, privacy-safe diagnostics and distinguish provider failure from invalid curriculum/input.
- Verify retry bounds, cancellation, idempotency, and recovery after refresh/offline transition.
- Track route latency, failure rates, provider usage, and user-visible outcomes without logging sensitive student content unnecessarily.

**Exit criteria:** Failures terminate clearly, recoverable work is preserved, retries are bounded, and regression tests cover known failure modes.

## Implementation rules

- No parallel mastery database or competing event contract.
- No schema migration until existing tables, RLS policies, and call sites are inspected.
- No UI-only mock values presented as real learning intelligence.
- No merge/deploy claims without actual CI and deployment evidence.
- Keep changes small, reversible, testable, and compatible with the current production Student experience.
- Build capability before broad release; use feature flags/progressive exposure when appropriate.
- Maintain offline usability and strict learner data isolation.

## Immediate next engineering pass

1. Inspect the actual implementations of the canonical event ingress, mastery reducer/projection, topic mastery reads, and existing weak-area/recommendation UI.
2. Produce a call-site/data-flow map and identify the smallest safe end-to-end slice.
3. Implement that slice with tests on this branch; do not stop at a planning document.
4. Reconcile this plan with the complete Google Doc when its text is available.
