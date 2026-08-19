# Cortex Event Pipeline Status

Date: 2026-08-19

## What is now true

Shadecode Student already had a unified event pipeline and a separate Cortex event queue. The missing safety/integration pieces were:

1. duplicate unified events could execute handlers repeatedly;
2. the unified-to-Cortex adapter could pass event names that were not part of the Cortex event vocabulary;
3. the event pipeline contained placeholder dispatch hooks that could duplicate work already performed by registered handlers.

This pass corrects those boundaries.

## Runtime idempotency

`EventPipeline.emit()` now requires an event ID and user ID and tracks processed IDs for the current runtime. Replaying the same event ID returns without dispatching handlers a second time.

The processed-ID set is bounded. This is deliberately a **runtime guarantee**, not a claim of durable cross-device idempotency.

### Durable requirement still outstanding

For durable replay safety, the future canonical learning-events store needs a unique `event_id` constraint and an authenticated server-side insert/replay policy. This is required before high-consequence effects such as XP, achievements, assessment finalization or financial actions are made dependent on replayable events.

## Cortex mapping policy

The unified pipeline supports:

- lesson started/completed;
- quiz completed;
- exam completed;
- challenge completed;
- study-session started/finished.

The current Cortex vocabulary supports a narrower set of event names. The adapter therefore forwards **only `exam_completed → exam.completed`** through this path at present.

Lesson, quiz, challenge and session events remain available to the other unified handlers and are not falsely relabeled as Cortex task/exam events.

This is intentional. Semantic correctness is more important than filling the queue with misleading signals.

## Existing intelligence layers preserved

The event work does not replace:

- `topic_mastery` and its mastery blending;
- retention-risk ranking;
- weak-area computation;
- recommendation-engine contracts;
- Cortex memory;
- existing direct Cortex events.

Those remain the sources to integrate through the canonical event model.

## Evidence policy

The intelligence layer must distinguish:

- **Observed evidence:** actual exam/quiz/lesson/study events and stored scores.
- **Derived signals:** mastery blends, retention-risk scores, weak-area rankings.
- **Heuristics:** formulas such as the current retention-risk decay model.
- **Generated language:** AI explanations/recommendations.

No layer should fabricate a score or imply validated psychometric precision where only a heuristic exists.

## Next integration step

Create the canonical learning-event persistence contract:

`event_id + user_id + type + occurred_at + source + payload + schema_version`

with server-side authorization and `UNIQUE(event_id)` semantics. Then connect the normalized events to the existing Student Intelligence adapters and recommendation pipeline.

## Acceptance gate

Before closing the Cortex Intelligence Core issue:

- replaying an event does not double-apply downstream effects;
- unsupported mappings are skipped explicitly;
- user isolation is preserved;
- tests cover normalization and replay;
- persisted event IDs are unique server-side;
- existing mastery/recommendation systems consume the canonical signal rather than parallel bespoke signals.
