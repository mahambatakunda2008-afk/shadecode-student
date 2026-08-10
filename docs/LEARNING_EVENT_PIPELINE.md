# Learning Event Pipeline

The event pipeline is the bridge between what happens in the product and the adaptive state used by Cortex.

```text
product event
     ↓
LearningEvent
     ↓
LearningObservation
     ↓
LearningState update
     ↓
SLU decision
```

## Supported event categories

- question answered
- lesson completed
- practice completed
- revision completed
- exam question

The current observation contract intentionally stays small: correctness, confidence, response time, difficulty, topic and timestamp.

## Why events are replayable

The state update is pure. Given the same initial state and event history, Shadecode should produce the same state. This enables:

- deterministic tests
- debugging
- historical reprocessing
- algorithm experiments
- migration to improved state-update rules
- offline synchronization later

## Important boundary

This module does not persist events or send telemetry. Persistence and analytics should be added separately so the core learning algorithm remains independent from infrastructure.

## Next evolution

Build a durable event schema and an outcome/evaluation layer. Before collecting broad telemetry, explicitly define retention, privacy, minimization and deletion rules. Then use the event stream to compare Shadow Cortex decisions with observed outcomes.
