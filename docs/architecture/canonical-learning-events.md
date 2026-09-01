# Canonical Learning Events

**Status:** implemented foundation + authenticated durable ingress + idempotent persistence + shared mastery transition  
**Updated:** 2026-09-01

Shadecode Student uses one normalized learning-event contract between product actions and Cortex/Student Intelligence. The canonical contract is shared platform infrastructure for Discovery, Student and Campus.

## Current architecture

```text
Product action
   ↓
Source event
   ↓
Authenticated /api/intelligence/events
   ↓
Canonical normalization + deterministic eventId
   ↓
public.cortex_events (durable, idempotent)
   ↓
Learning observation / shared mastery transition
   ↓
Cortex context + recommendations
```

The browser emitter is a delivery mechanism, not a second source of truth. When offline or when delivery fails, events remain in a bounded local queue and retry after reconnect.

## Canonical identity

`eventId = canonicalEventId(userId, source, sourceEventId)`.

The database enforces uniqueness on the canonical event ID. Replaying the same source event therefore does not create another durable event.

## Supported signals

The canonical contract currently recognizes:

- `lesson.viewed`
- `lesson.completed`
- `question.attempted`
- `quiz.completed`
- `exam.started`
- `exam.completed`
- `project.evidence_added`
- `project.stage_completed`
- `mistake.reviewed`
- `task.completed`

`src/lib/intelligence/learningObservation.ts` is the explicit adapter from canonical product events into the narrower Cortex/SLS `LearningObservation` contract. It preserves optional graded `percentage`/`evidenceScore` metadata so a scored observation can use its actual percentage instead of being collapsed to binary correctness. `src/lib/cortex/learningEvents.ts` remains the legacy/narrow reducer adapter and is not a second canonical event system.

## Mastery boundary

The canonical event RPC is intentionally **persistence-only**. It authenticates the caller, validates canonical identity, stores the event in `public.cortex_events`, and returns the existing row on replay. It does **not** mutate `topic_mastery`.

The score transition is now centralized in `src/lib/intelligence/masteryTransition.ts`. Both `src/lib/cortex/learningState.ts` and `src/lib/topicMastery/blend.ts` use the same 70/30 history/evidence EMA rule. This removes the previous disagreement where Cortex applied a difficulty-adjusted binary formula while production exam mastery used a separate EMA formula.

The richer Cortex dimensions (retention, confidence, stability, exposure, error rate, response speed, prerequisite health, recent improvement and uncertainty) are reduced by the same pure `reduceLearningObservation` function. Their coefficients are deliberately conservative heuristics and remain candidates for future calibration rather than claims of validated psychometrics.

The `projectTopicMastery` function projects the already-reduced state into the durable `topic_mastery` shape without recomputing mastery. The production exam marking route continues to use the compatibility `blendMastery` projection for existing exam behavior while the richer reducer is available for new evidence-driven integrations.

**Rule:** there must be one score transition rule and one authoritative richer-state reducer. Event persistence must never independently mutate mastery.

## Offline contract

Core learning actions remain usable without a network connection. The canonical event emitter stores failed/offline delivery locally and retries on reconnect. Local completion/scoring/persistence must never depend on an AI response or network round trip.

## Current integration status

- Learn: lesson-view evidence is wired; lesson-completion/question-level coverage still requires call-site audit.
- Exam Simulation: aggregate completion and final graded question-attempt evidence are emitted through the canonical helper. Each question event carries correctness and score metadata and uses deterministic exam/question identity.
- Project Studio: existing event integrations are present and should remain on the canonical ingress.
- Primary: first activity must use this same evidence spine rather than creating a separate Primary analytics contract.

## Verification gates

Before marking the evidence spine production-complete:

1. authenticated event ingress succeeds;
2. offline event queues locally;
3. reconnect flushes the queue;
4. duplicate source-event replay is idempotent;
5. canonical event persistence is durable;
6. learning observation mapping is deterministic;
7. the shared mastery transition is covered by unit tests;
8. one authoritative richer-state reducer is selected and implemented;
9. real Learn, Exam Simulation and Project Studio actions are covered by integration/E2E tests;
10. the first Discovery activity uses the same contract.

## Next engineering pass

- audit the sync revision protocol against all local-first stores;
- add authenticated/offline/replay E2E coverage;
- wire durable rich-state projection into the selected evidence consumers without double-counting exam aggregates;
- then build the first Primary activity on the shared learning spine.
