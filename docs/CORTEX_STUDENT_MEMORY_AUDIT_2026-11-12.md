# Cortex Student Memory and Continuity Audit

**Audit date:** 12 November 2026  
**Status:** Source-level baseline; authenticated database/RLS and end-to-end verification still required  
**Tracking:** https://github.com/mahambatakunda2008-afk/shadecode-student/issues/571

## Executive finding

Shadecode Student does have persistent learner data, but it is split across distinct stores with different purposes. The accurate diagnosis is not "there is no persistent memory." The gap is that Cortex does not yet demonstrably assemble the existing durable evidence into one trustworthy, authenticated, curriculum-aware learner context and use it consistently across learning workflows.

Do not replace the existing stores or introduce a second mastery model.

## Existing stores and responsibilities

| Store / module | What it currently represents | Important boundary |
|---|---|---|
| cortex_memory via src/lib/cortex/memory.ts | Per-user profile/activity summary: streak, frequently studied subjects, preferred study hours, session duration/count, exam summaries, lesson totals, saved insight fields | Coarse profile memory, not a complete concept-level academic model |
| CortexMemory class in the same module | In-process question/answer cache with per-user filtering and bounded retention | Volatile process cache; not durable across process restarts/deployments |
| cortex_events | Canonical learning-event history, persisted through authenticated insert_canonical_cortex_event ingress | Source event history; event eligibility and idempotency must be preserved |
| topic_mastery | Durable topic-level projection: mastery, attempts, retention, confidence, stability, exposure, error rate, response speed, prerequisite health, recent improvement, uncertainty and last-attempt time | Rebuildable projection, not a second source event log |
| learner_curriculum_objective_progress | Existing syllabus-objective progress used by the syllabus mastery heatmap | Do not assume it is interchangeable with topic_mastery; mapping must be explicit and verified |
| src/lib/cortex/runtime/cache.ts | Short-lived Cortex response cache (30-minute TTL), browser localStorage or process memory | Cache only; not student memory |

## Source trace

### Durable profile memory

- getMemory(userId) reads one cortex_memory row filtered by user_id.
- updateMemory(userId, patch) upserts that row on user_id.
- CortexCore reads the profile and builds a snapshot containing activity/profile fields and curriculum progress.
- The current mapping deliberately reads XP from user_profiles elsewhere and leaves some fields unavailable in this memory object. Some fields such as lastTopic and lastScore are not restored from durable storage by the current mapping.
- The profile memory currently does not include a verified per-concept event history or a typed explanation-preference model.

### Topic-level learning evidence

- POST /api/intelligence/events authenticates the user through Supabase server auth and replaces any supplied user ID with the authenticated identity.
- Supported source events are normalized and persisted through insert_canonical_cortex_event.
- Eligible topic-linked events are adapted by learningEventToObservation.
- projectLearningEvent writes the rebuildable topic_mastery projection and uses a marker in cortex_events to prevent duplicate projection.
- Events without an explicit topic and aggregate-only completion events are excluded from mastery projection.
- src/lib/cortex/learningState.ts provides the richer deterministic transition; src/lib/intelligence/masteryTransition.ts is the shared score transition.
- The transition's 70/30 weighting is documented as a simple heuristic, not a validated psychometric model.

### AI context and cache

- CortexCore currently passes a compact profile snapshot, weak-topic/subject fields and resolved curriculum context to its tutoring/recommendation path.
- src/lib/cortex/runtime/ai-gateway.ts creates user-scoped cache keys from request type, user ID and input fingerprint. Its cache is not a durable learner model.
- src/lib/cortex/router.ts uses the in-process CortexMemory question/answer cache before invoking TeacherAI. This cache must not be conflated with cortex_memory or topic_mastery.

## Gaps requiring implementation and verification

1. **One read-only learner context:** no verified common resolver currently joins profile memory, topic mastery, canonical event evidence, objective progress and active curriculum identity for all relevant Cortex consumers.
2. **Evidence provenance:** every topic state needs evidence count, source/time bounds, uncertainty and a reason; no evidence must remain "insufficient evidence."
3. **Mistake patterns:** current topic projection has an error rate, but source events do not yet establish a sufficiently rich, consistently classified misconception taxonomy. Do not infer conceptual/procedural/careless categories without evidence.
4. **Forgetting model:** retention is stored, but a calibrated time-based forgetting/decay model is not established by the inspected code. Do not display predictive decay percentages until a defensible model is designed and tested.
5. **Learning preferences:** the inspected durable profile does not expose a typed, editable explanation-style preference contract. Add explicit preference capture before inference from behavior.
6. **Workflow continuity:** verify that the same authorized learner context reaches tutor, Learn, Exam Simulation, practical activities, handwriting/math tools and recommendations where relevant.
7. **Failure semantics:** distinguish "no record" from query failure. Do not silently turn database/RLS/network errors into a successful-looking default student profile for personalized decisions.
8. **Offline and cross-device behavior:** verify queued event replay, account switching, cross-device reconciliation and no duplicate mastery increments.
9. **Objective/topic mapping:** keep syllabus objective progress separate from topic mastery unless a stable, verified mapping exists.

## Implementation sequence

### Phase 1: Authenticated read-only context resolver

- Trace and document the RLS policies, database constraints and canonical identity for each store.
- Add a server-only resolver using the authenticated Supabase user, never a client-provided identity.
- Return a versioned typed contract with explicit available, insufficient_evidence, and unavailable states.
- Join only on stable IDs and the learner's active subject/curriculum selection.
- Include provenance, timestamps, counts and uncertainty; do not mutate source stores.

### Phase 2: Cortex integration

- Pass the same context to tutoring and recommendation entry points.
- Keep curriculum claims grounded in the exact verified board, qualification, subject, syllabus and version.
- Keep deterministic eligibility and next-action selection outside the model; use AI only to explain or adapt the presentation.

### Phase 3: Intelligence

- Add typed mistake evidence only where source attempts support it.
- Define and validate retention/forgetting calibration before exposing predictions.
- Add explicit, editable explanation preferences and test whether adaptation improves outcomes.

### Phase 4: Product continuity and acceptance

- Connect shared context across relevant modules and supported clients.
- Test offline queue replay, duplicate delivery, account switching, cross-device sync, user isolation and subject/syllabus boundaries.
- Update the capability registry and roadmap only after code, tests and learner-flow evidence support the new status.

## Non-negotiable safeguards

- Reuse cortex_memory, cortex_events, topic_mastery, objective-progress data and the shared mastery transition.
- Do not create a parallel mastery table or score algorithm.
- Do not infer mastery from lesson views, generated content or activity volume alone.
- Do not convert missing evidence to 0% mastery.
- Do not infer stable learning preferences from one interaction.
- Do not use arbitrary decay percentages or unsupported misconception labels.
- Preserve local/offline learning history and make AI-provider outages non-fatal to saved progress.
- No production schema/data changes until RLS, migration replay, tests and authenticated end-to-end flows are verified.

## Implementation added on the audit branch

- Added a server-only `resolveAuthenticatedCortexStudentContext()` resolver. It accepts no user ID and derives identity from `supabase.auth.getUser()`.
- Added `GET /api/cortex/student-context`, with private/no-store caching and 401/503 failure semantics.
- The resolver reads only the authenticated learner's `cortex_memory` and `topic_mastery` rows. Missing rows are represented as `insufficient_evidence`; read failures throw rather than masquerading as empty learner history.
- Cortex Learn now attempts to load the same durable context and passes it to the deterministic tutor. If the read is unavailable, tutoring continues without continuity claims.
- The tutor only references recorded attempts when the topic key, subject key and exact verified syllabus ID match. It does not expose a mastery percentage or claim a misconception from this limited evidence.
- Added focused tests for matching topic/subject, cross-subject isolation, and absent evidence.

This is the first integration slice, not the complete student model. It does not yet connect every product workflow, objective progress, preferences, misconception taxonomy, or a calibrated forgetting model.

## Verification still outstanding

This is a source-level audit only. The following have not been established by this document:

- Live database schema, constraints, row counts or current production RLS behavior.
- End-to-end access to all learner stores under real student sessions.
- Whether every module emits the canonical events required for reliable concept-level evidence. The live database currently reports five topic_mastery rows and two cortex_memory rows; these counts are operational snapshots, not coverage or quality guarantees.
- Whether objective progress can be mapped to topic mastery without ambiguity.
- Offline replay and cross-device continuity under real device/network conditions.
- Full CI, build and browser acceptance for any new implementation.

Do not call the student memory system complete until these checks pass.
