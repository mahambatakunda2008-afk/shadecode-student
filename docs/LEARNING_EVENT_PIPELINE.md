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


## Verified lesson quiz delivery

Lesson quizzes use server-issued attempts with answer keys retained in the database. Submission locks the attempt to the first answer set, then a single database transaction grades the stored answer key, persists one canonical `question_attempted` event per answer, projects those observations into topic mastery only when a unique verified syllabus-topic mapping exists, records curriculum objective assessment when verified objective keys are attached, writes an analytics-only `quiz_completed` summary, invalidates recommendations through the canonical-event trigger, and finalizes the attempt.

The client does not re-send question evidence after completion. Deterministic per-question event identities make retries safe. A completed attempt replay returns the stored result without repeating topic exposure. Lessons without a unique verified curriculum-topic mapping still retain durable question evidence, but do not receive guessed topic mastery.
