# Learn Lesson Contract

## Purpose

Learn-generated content is a teaching module, not a summary card. A learner should be able to continue studying from the generated lesson without needing another AI response just to make the material meaningful.

## Scope-aware generation

### Focused request
A normal focused lesson uses roughly 8-14 purposeful blocks and stays centered on the requested topic.

### Deep request
A deep request uses roughly 16-24 substantive blocks. It should build a mental model, explain mechanisms or reasoning where relevant, include worked examples, checkpoints, misconceptions, applications or exam transfer when relevant, synthesis, curiosity and a clear next path.

### Broad-topic request
A request such as "Organic Chemistry" is treated as a connected mini-course. Cortex first establishes the internal map of the topic, then teaches the major branches in dependency order. Major branches receive substantive teaching, not just labels. The lesson ends by connecting the branches and opening a continuation path.

The curriculum planner provides a scope spine for known broad domains and a structured generic spine for other broad topics. Verified curriculum context constrains curriculum-specific claims.

## Quality gate

For broad/deep sessions the server rejects output that is instructionally thin. It expects at least 16 blocks for broad requests, substantial concept/structure/mechanism/application/synthesis content, at least 3 worked examples or applications for teaching requests, at least 3 checkpoints, and at least one continuation element.

Failed lessons receive a repair pass before the request is rejected.

## Durable identity

`learn_lessons.topic` stores the learner's actual topic request. It is nullable for historical lessons.

Completion evidence is bridged at the database boundary into `public.cortex_events` as `lesson.completed`, carrying `topicId` and the resolved subject name when available.

## Product rule

A lesson is successful only when it helps the learner **understand, apply, check, correct, practise, connect, and continue**. Visual polish is not a substitute for instructional density.
