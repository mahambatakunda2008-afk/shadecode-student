# Shadecode Student: Product Reality, Trust and Validation Plan

**Audit date:** 2026-10-23  
**Status:** Engineering strategy and evidence register; not a security certification or independent product evaluation.

## Executive assessment

Shadecode Student has real architecture and product code, but the existence of routes, tables, AI providers, and learning-state helpers does not prove that its central promise is reliable for real students. The right position is neither “the product is only vibe-coded” nor “Cortex is already a breakthrough.” It is: **a serious early-stage system with implemented foundations, uneven maturity, and important claims that must be validated.**

This document converts the supplied critique into testable risks and release gates. The Reddit quotes and Product Hunt counts in the critique are treated as externally supplied claims, not independently verified facts in this audit.

## What the repository currently supports as evidence

- The README describes a canonical learning-evidence flow: product action → source event → normalization → authenticated durable persistence → learning observation/mastery state → intervention → measured outcome.
- The README identifies `POST /api/intelligence/events` and `public.cortex_events` as the canonical event ingress and durable event store, with idempotency and a browser-side queue for retry/offline delivery.
- `src/lib/cortex/learningState.ts` contains a pure state reducer and a richer mastery projection. The reducer currently uses heuristics, including a 70/30 transition for subsequent observations and simple retention/stability updates. Those formulas are implementation choices, not validated educational or psychometric models.
- `src/lib/cortex/memory.ts` explicitly describes a process-local in-memory Q/A cache with size limits and similarity retrieval. It is not durable, cross-session learner memory and must not be described as such.
- `docs/CAPABILITY_REGISTRY.md` marks several Cortex capabilities partial, foundational, planned or research-only, including local AI runtime, durable richer mastery projection, adaptive difficulty and next-best-action engine.
- The README itself identifies reconciliation of local learning state, existing mastery blending and durable mastery semantics as a current priority.
- The package scripts include type-checking, linting, unit tests, E2E tests, and curriculum readiness checks. The presence of these scripts is not evidence that they currently pass or that all critical paths are covered.

## Risk register and response

### 1. “Vibe-coded prototype” / maintainability

**Risk:** rapid iteration can leave inconsistent patterns, duplicated logic, inline styling, weak boundaries, and fragile regressions.

**What we can say now:** there is a defined Next.js/TypeScript codebase, test tooling, architecture documentation, canonical event ingress, and an explicit capability registry. That contradicts the strongest interpretation that there is no architecture at all. It does not prove production-grade consistency or security.

**Work:**
- inventory inline styles and duplicated UI patterns; prioritize user-facing screens rather than doing a cosmetic repo-wide rewrite;
- enforce shared design tokens/components for new changes and migrate high-change screens incrementally;
- keep business logic in typed modules and testable services rather than embedding it in page components;
- run `npm run verify` and relevant E2E tests for each meaningful change;
- track defects, regressions, build health and time-to-recovery rather than claiming quality from code appearance alone.

**Release gate:** critical Learn, sign-in, progress persistence and Exam Simulation paths pass CI and regression tests; no broad rewrite without a demonstrated failure mode.

### 2. Product originality and UX quality

**Risk:** inconsistent design, generic AI visual tropes and rough interaction details lower trust, even if the underlying idea is useful.

**Work:**
- define a distinct, consistent visual language and a small iconography rule set;
- remove redundant visual noise, generic “AI magic” framing and decorative UI that does not help the task;
- prioritize clarity, accessibility, loading/recovery states, empty states, keyboard/touch behavior and low-data performance;
- test real study tasks on low-end Android devices and constrained networks.

**Measure:** task completion, time to start a lesson, recovery success, usability findings and repeated use. Do not treat aesthetic preference alone as proof of educational efficacy.

### 3. Cortex memory, identity and contradictory evidence

**Risk:** process-local cache may disappear between requests/instances; persistent events may exist without a trustworthy derived learner state; contradictory or assisted observations may contaminate mastery estimates.

**Current boundary:** the Q/A cache in `src/lib/cortex/memory.ts` is a convenience cache, not the durable learner-memory system. The canonical event store and mastery-related stores are separate mechanisms. Their existence alone does not prove end-to-end identity continuity, conflict resolution or reliable recommendations.

**Work:**
- define a versioned learner-state contract with provenance, timestamps, assessment context, assistance level, confidence, and correction/withdrawal semantics;
- keep raw events immutable and idempotent; make derived state rebuildable and versioned;
- ensure user identity is established server-side and enforce user-scoped reads/writes through RLS and authorization checks;
- test duplicate delivery, out-of-order events, retries, conflicting observations, account switching, concurrent sessions, derived-state rebuilds and deletion/export requests;
- label heuristics as estimates and expose uncertainty internally; never let generated text silently rewrite canonical learning evidence;
- validate whether each signal improves the next learning decision before expanding the model.

**Release gate:** a repeatable end-to-end test proves that a student's progress survives reload, a new session and a retry; duplicate events do not double-count; one learner cannot retrieve another learner's private state; derived state can be reconciled from canonical evidence.

### 4. AI dependence versus learner agency

**Risk:** an AI tutor can do the thinking for students, create false confidence or reward passive consumption.

**Product principle:** Cortex should help students become more capable of directing their own learning, not make them dependent on a chat interface.

**Work:**
- make direct practice, hints, worked examples, self-explanation, retrieval practice and reflection first-class options;
- allow AI-light and non-generative workflows where they are better;
- progressively reveal hints instead of immediately giving full answers;
- measure independent attempt quality, delayed recall and transfer, not just lesson completion or time in app;
- let students inspect and correct their learning profile and understand why a recommendation appeared.

**Release gate:** evaluate whether the product improves independent performance on a later task compared with a baseline or appropriate comparison group. Do not claim learning gains until measured.

### 5. Narrow curriculum reach and curriculum trust

**Risk:** a board name in a picker is mistaken for complete, verified coverage. Incorrect syllabus mappings are worse than an honest limitation.

**Current database snapshot:** a read-only audit on 2026-10-23 found 9 syllabus-version records across Cambridge and ZIMSEC; the current readiness-gate diagnostic found blockers on all 9. Stored objective status is not proof of full syllabus or assessment coverage.

**Work:**
- close readiness blockers for existing subjects before expanding marketing claims;
- display board/qualification/subject/version coverage at subject level;
- require source provenance and verification for syllabus objectives, assessment structures, paper metadata and mark schemes;
- make unsupported versions fail closed rather than substituting plausible generated material;
- evaluate one additional board only after current curriculum workflows pass the release gates.

**Release gate:** no “supported” claim without verified source/version, coverage checks, topic/objective mapping, subject eligibility and working Learn plus assessment flows.

### 6. Lack of independent validation

**Risk:** launch listings, downloads, generated lessons and registered accounts do not establish usefulness, correctness or retention.

**Work:**
- recruit a small, explicit pilot group with informed consent and clear feedback channels;
- test a few concrete study tasks with real learners and compare against their normal workflow;
- collect lesson correctness reports, task success, repeat use and delayed learning checks;
- publish only permissioned, representative results, including limitations and failures;
- separate “signed up,” “active,” “completed a study task,” “returned,” and “demonstrated learning” as different metrics.

**Release gate:** publish no efficacy claims until a documented evaluation supports them. A zero-review listing is a lack-of-evidence signal, not proof the product is bad or unused.

### 7. Privacy, security and operational continuity

**Risk:** academic performance and learning weaknesses are sensitive user data. An early-stage product needs clear handling, recovery and incident procedures.

**Work:**
- review authentication, server-side authorization, RLS policies, API input validation, rate limits, secrets handling, data retention, deletion/export, and logging for personal data;
- document what is stored, why it is stored, which AI providers receive what data, and how users can delete or correct it;
- test backups/recovery, provider outages, offline queue replay and deployment rollback;
- avoid claiming FERPA/COPPA/SOC 2 compliance or security certification without a proper scope assessment and evidence.

**Release gate:** documented threat model and data-flow inventory, passing authorization tests for critical endpoints, recovery drill, and a usable privacy explanation before broad adoption.

## Prioritized implementation sequence

### P0: trust and reliability
1. Stabilize sign-in, lesson generation, progress persistence and recovery.
2. Prove canonical event idempotency and user isolation.
3. Reconcile richer local state with durable mastery without introducing a second source of truth.
4. Finish current curriculum readiness blockers.
5. Run type-check, lint, unit tests and critical E2E paths; report failures honestly.

### P1: validation
6. Instrument the complete learning loop from attempt to recommendation to next attempt.
7. Recruit a small student pilot and capture structured feedback.
8. Measure independent and delayed learning outcomes before describing Cortex as adaptive or effective.

### P2: expansion and polish
9. Improve the highest-friction UI paths with consistent components and accessibility checks.
10. Add the next examination board only through the verified curriculum contract.
11. Expand to wider education levels only when their distinct workflows are validated.

## Public positioning rule

Use language such as “early-stage learning platform,” “Cortex learning-intelligence foundations,” and “curriculum coverage varies by subject and syllabus version” where accurate. Avoid calling Cortex a breakthrough, claiming proven personalized learning, implying comprehensive board coverage, or describing a prototype as fully production-hardened without evidence.

## Success criteria

- Critical learning flows pass repeatable tests.
- Progress survives reload/session boundaries and reconciles after retries.
- No cross-user leakage in tested paths.
- Current syllabus readiness blockers are visible and reduced.
- Learners can correct or understand important learning-state signals.
- Real users complete study tasks and return; learning impact is evaluated separately.
- Public claims match verified capabilities.

The objective is not to win an argument with a Reddit commenter. It is to make the product harder to break, easier to trust, and demonstrably useful to learners.
