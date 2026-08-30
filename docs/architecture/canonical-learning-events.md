# Canonical Learning Events

**Status:** implemented foundation + authenticated ingress
**Updated:** 2026-08-30

Shadecode Student uses one normalized learning-event contract between product actions and Cortex/Student Intelligence.

## Flow

`student action → source event → authenticated ingress → normalization → canonical event ID → idempotency → Student Intelligence`

### Canonical identity

`eventId = canonicalEventId(userId, source, sourceEventId)`

The source event ID is retained so replay and debugging do not lose provenance. User identity is part of the identity calculation, preventing an identical source ID from crossing account boundaries.

### Supported signals

The first contract supports lesson views/completions, question attempts, quiz completion, exam start/completion, Project Studio evidence/stage events, mistake review and task completion.

Unsupported event types are explicitly rejected. They are never silently re-labelled as a different learning signal. Malformed timestamps are also rejected rather than being coerced to an artificial epoch timestamp.

## Authenticated ingress

`POST /api/intelligence/events` is now the server boundary for canonical event submissions. The authenticated Supabase session supplies `userId`; clients cannot choose another user's ID. The route validates and normalizes the event and returns its canonical identity.

### Persistence boundary

The ingress currently returns `persisted: false` by design. The live `learning_events` table predates this contract and has a different column shape (`type`, `subject`, `topic`, `score`, `time_spent`, `metadata`, `created_at`). Writing canonical events into that table before a safe migration would discard important identity/provenance semantics and make the system appear more complete than it is.

The next migration must add a durable canonical event identity/idempotency key, preserve legacy records, and only then enable persistence. This is intentionally a hard boundary, not a TODO hidden behind a successful API response.

## Evidence policy

Deterministic event metadata is evidence. Mastery, retention and recommendations remain downstream computations and must not be fabricated when evidence is missing. Foundation models may explain or assist with learning, but they are not the source of truth for deterministic learning state.

## Idempotency

The current `LearningEventInbox` provides the deterministic contract and testable duplicate guard. Production persistence must use the same canonical event ID as a server-side idempotency key before high-consequence downstream writes.

## Next integration

Migrate real product emitters onto the authenticated ingress, beginning with lesson/question/exam actions. Then migrate persistence safely and connect only supported events to Student Intelligence. Do not create a second event schema or replace `topic_mastery`, weak-area computation, retention ranking, or recommendation semantics.
