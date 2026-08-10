# Shadecode Learning State v1

Shadecode Learning State (SLS) is the state layer beneath the Learning Utility. It represents what the system currently estimates about a student's relationship with a topic.

## State vector

Each topic carries:

- `mastery`: current estimated ability
- `retention`: estimated ability to retrieve after time has passed
- `confidence`: student's reported/observed confidence
- `stability`: consistency of recent performance
- `exposure`: number of observed learning events
- `errorRate`: recent error signal
- `responseSpeed`: normalized response-speed signal
- `prerequisiteHealth`: estimated health of prerequisite knowledge
- `recentImprovement`: change in mastery estimate
- `uncertainty`: how little evidence Shadecode has about the state

## Design principles

### State is an estimate

These values are not measurements of a student's brain and must not be presented as scientific facts. They are internal decision signals.

### Observable evidence wins

The state should be updated from things Shadecode can actually observe: answers, attempts, completion, time, confidence inputs, revision intervals and later performance.

### Uncertainty is first-class

A new topic should not be treated as mastered simply because no failure has been observed. High uncertainty tells the decision system that it needs evidence.

### Bounded updates

One event should not radically rewrite the student's state. This reduces volatility and makes the system easier to debug.

## Current implementation

`src/lib/cortex/learningState.ts` contains a pure state initializer and bounded single-observation update function.

It is deliberately independent of Supabase, AI providers and UI code. That makes it suitable for offline execution and future evaluation.

## Next evolution

1. Add multi-event trajectory updates.
2. Add explicit forgetting/retrieval intervals.
3. Connect prerequisite relationships.
4. Feed SLS into SLU candidate scoring.
5. Persist state snapshots only after the state contract is stable.
6. Build shadow evaluation before changing production decisions.

## What we are not doing yet

We are not claiming that this is a validated model of human memory, mastery, or cognition. The implementation is product infrastructure designed to become evidence-calibrated through real outcome evaluation.
