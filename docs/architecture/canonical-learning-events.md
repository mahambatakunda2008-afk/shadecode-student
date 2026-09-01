# Canonical Learning Events

**Status:** implemented foundation + authenticated durable ingress + idempotent state application  
**Updated:** 2026-09-01

Shadecode Student uses one normalized learning-event contract between product actions and Cortex/Student Intelligence. The canonical contract is shared platform infrastructure for Discovery, Student and Campus.

## Flow

`product action → source event → authenticated ingress → normalization → canonical event ID → idempotent durable persistence → learning observation/mastery state`

### Canonical identity

`eventId = canonicalEventId(userId, source, sourceEventId)`

The source event ID is retained so replay and debugging do not lose provenance. User identity is part of the identity calculation, preventing an identical source ID from crossing account boundaries.

### Supported signals

The contract supports lesson views/completions, question attempts, quiz completion, exam start/completion, Project Studio evidence/stage events, mistake review and task completion.

Unsupported event types are explicitly rejected. They are never silently re-labelled as a different learning signal. Malformed timestamps are also rejected rather than being coerced to an artificial epoch timestamp.

## Authenticated ingress

`POST /api/intelligence/events` is the server boundary for canonical event submissions. The authenticated Supabase session supplies `userId`; clients cannot choose another user's ID. The route validates and normalizes the event before durable persistence.

### Durable persistence boundary

Canonical events are persisted in `public.cortex_events` through the authenticated Supabase RPC `insert_canonical_cortex_event`. The old `learning_events` shape is not used as the canonical store.

The persistence path is idempotent. The database enforces uniqueness on the canonical `eventId`, so replaying the same source event returns the existing canonical record rather than applying downstream state twice. The RPC also requires both `eventId` and `sourceEventId`, preserving provenance and replay safety.

For supported evidence events with a topic, the RPC updates the established `topic_mastery` store with deterministic learning-state fields. It does not create a second mastery table. Topic state remains user-scoped through RLS.

## Offline-first delivery

The browser-side emitter is deliberately queue-backed. If the device is offline, or the authenticated ingress cannot be reached, the event remains in a bounded local queue and is retried when connectivity returns. Core learning actions must not depend on the network being available.

The queue is a delivery mechanism, not a second source of truth. Canonical identity and server-side idempotency make retries safe. Local learning-state computation remains available for offline experiences and should converge with durable state during synchronization.

## Evidence policy

Deterministic event metadata is evidence. Mastery, retention and recommendations remain downstream computations and must not be fabricated when evidence is missing. Foundation models may explain or assist with learning, but they are not the source of truth for deterministic learning state.

## Learning observation adapter

`src/lib/intelligence/learningObservation.ts` is the explicit adapter from the canonical event contract to the narrower Cortex/SLS `LearningObservation` shape. This prevents Cortex-specific observation semantics from becoming a competing product event schema.

`src/lib/cortex/learningEvents.ts` remains a narrower legacy Cortex adapter. New product surfaces should emit canonical events and use the intelligence-layer adapter rather than creating additional event contracts.

## Current emitters

A shared `emitLearningEvent` client helper already posts canonical source events to the authenticated ingress, queues failures locally, and flushes on reconnect. Existing integrations include Learn lesson evidence, Exam Simulation events and Project Studio events. The next integration pass should audit real product call sites and fill evidence gaps rather than introduce another emitter abstraction.

## Next integration

1. Audit and connect the remaining real lesson/question/exam product actions.
2. Reconcile mastery-update semantics with the existing production `blendMastery` / local learning-state engine before broadening server-side state updates.
3. Add end-to-end coverage for authenticated persistence, duplicate replay and offline queue recovery.
4. Build the first Primary Discovery activity on this same canonical evidence path.
5. Keep documentation, product copy and public positioning synchronized as these foundations become user-visible.

Do not create a second event schema or replace `topic_mastery`, weak-area computation, retention ranking, or recommendation semantics without an explicit migration plan.
