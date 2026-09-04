# Learn Lesson Contract

## Purpose

Learn-generated content must be useful without another AI call. A generated lesson is treated as a small teaching module, not a summary card.

## Required teaching sequence

Generation targets 12-16 blocks and must cover:

1. objectives
2. prerequisite activation
3. first-principles concept explanation
4. precise definitions
5. formulas/relationships and conditions
6. fully worked example
7. understanding checkpoint with answer/reasoning
8. misconception correction
9. exam-style application
10. common mistakes/traps
11. memorable summary
12. progressive offline practice with answer guidance
13. topic-specific study/exam tactic

The server rejects output that is too short or missing the core teaching types, then gives the model a repair pass before returning an error.

## Durable identity

`learn_lessons.topic` stores the learner's actual topic request. It is nullable for historical lessons.

Completion evidence is bridged at the database boundary into `public.cortex_events` as `lesson.completed`, carrying `topicId` and the resolved subject name when available. This allows the generic learning-event projection to use the same topic identity for learner-state updates.

## Product rule

A lesson is successful only when it helps the learner **understand, apply, check, correct, and practise**. Visual polish is not a substitute for instructional density.
