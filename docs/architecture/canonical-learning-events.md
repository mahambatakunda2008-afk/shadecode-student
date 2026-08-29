# Canonical Learning Events

**Status:** implemented foundation
**Updated:** 2026-08-29

Shadecode Student uses one normalized learning-event contract between product actions and Cortex/Student Intelligence.

## Flow

`student action → source event → normalization → canonical event ID → idempotency → Student Intelligence`

### Canonical identity

`eventId = canonicalEventId(userId, source, sourceEventId)`

The source event ID is retained so replay and debugging do not lose provenance. User identity is part of the identity calculation, preventing an identical source ID from crossing account boundaries.

### Supported signals

The first contract supports lesson views/completions, question attempts, quiz completion, exam start/completion, Project Studio evidence/stage events, mistake review and task completion.

Unsupported event types are explicitly skipped. They are never silently re-labelled as a different learning signal. Malformed timestamps are also rejected rather than being coerced to an artificial epoch timestamp.

## Evidence policy

Deterministic event metadata is evidence. Mastery, retention and recommendations remain downstream computations and must not be fabricated when evidence is missing. Foundation models may explain or assist with learning, but they are not the source of truth for deterministic learning state.

## Idempotency

The current `LearningEventInbox` provides the deterministic contract and testable duplicate guard. Production persistence must use the same canonical event ID as a server-side idempotency key before high-consequence downstream writes.

## Current production state

A `learning_events` table already exists in the live Supabase project, but it predates this normalized contract and has a different column shape (`type`, `subject`, `topic`, `score`, `time_spent`, `metadata`, `created_at`). It must not be treated as if it were already a canonical-event store. The normalized event layer remains deliberately separate until a migration can preserve existing data and establish a unique server-side idempotency key safely.

## Next integration

Migrate existing unified event emitters onto this contract one surface at a time, beginning with lesson/question/exam actions. Then introduce server-side persistence keyed by the canonical event ID and connect only supported events to Student Intelligence. Do not create a second event schema or replace `topic_mastery`, weak-area computation, retention ranking, or recommendation semantics.
