# Canonical Learning Events

**Status:** implemented foundation + authenticated durable ingress + idempotent state application  
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
Learning observation / mastery state
   ↓
Cortex context + recommendations
```

The browser emitter is a delivery mechanism, not a second source of truth. When offline or when delivery fails, events remain in a bounded local queue and retry after reconnect.

## Canonical identity

`eventId = canonicalEventId(userId, source, sourceEventId)`.

The database enforces uniqueness on the canonical event ID. Replaying the same source event therefore does not create another durable event or apply the same durable state transition twice.

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

`src/lib/intelligence/learningObservation.ts` is the explicit adapter from canonical product events into the narrower Cortex/SLS `LearningObservation` contract. `src/lib/cortex/learningEvents.ts` remains the legacy/narrow reducer adapter and is not a second canonical event system.

## Important mastery boundary

There are currently two established mastery producers that must be reconciled before event-driven mastery is broadened:

1. `src/lib/cortex/learningState.ts` updates a richer local topic state from individual observations.
2. `src/lib/topicMastery/blend.ts` updates the production `topic_mastery` row from graded exam topic percentages using a deliberately simple 70/30 EMA heuristic.

The exam marking route currently uses `blendMastery` for graded topic results. The durable event RPC can also apply supported evidence to `topic_mastery`, so these algorithms must not be allowed to independently mutate the same learner state with incompatible math.

**Rule:** event persistence may continue independently, but new mastery mutations should wait until the pure learning-state semantics are reconciled and one authoritative state-transition path is selected.

## Offline contract

Core learning actions remain usable without a network connection. The canonical event emitter stores failed/offline delivery locally and retries on reconnect. Local completion/scoring/persistence must never depend on an AI response or network round trip.

## Current integration status

- Learn: lesson-view evidence is wired; lesson-completion/question-level coverage still requires call-site audit.
- Exam Simulation: aggregate exam-completion evidence is wired. Question-attempt helper exists but is not yet wired into the actual answer interaction path.
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
7. mastery transition is performed by one reconciled algorithm;
8. real Learn, Exam Simulation and Project Studio actions are covered by integration/E2E tests;
9. the first Discovery activity uses the same contract.

## Next engineering pass

- reconcile `updateLearningState` and `blendMastery` semantics;
- wire real question-attempt evidence with correctness, confidence and response-time metadata where available;
- audit the sync revision protocol against all local-first stores;
- add authenticated/offline/replay E2E coverage;
- then build the first Primary activity on the shared learning spine.
