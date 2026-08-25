# Learn renderer integration

The existing Learn page is a launcher/history experience. It calls `/api/learn` and routes to `/learn/:id`. The generation endpoint currently emits a legacy `blocks` shape, while the new LearningContentRenderer expects typed `LearningContentBlock` objects.

## Integration rule

Do not render the new lesson model by string concatenation. Normalize persisted lesson blocks at the boundary and then render through one shared renderer.

## Required lesson experience

1. Goal / learning promise.
2. Prerequisite awareness.
3. Explanation with progressive disclosure.
4. Structured equations and diagrams.
5. Worked example with revealable reasoning.
6. Retrieval practice.
7. Hints before answers.
8. Misconception feedback.
9. Transfer challenge.
10. Exam connection.
11. Curiosity bridge.
12. Mastery / next-step recommendation.

## Backward compatibility

Legacy blocks must continue rendering while new typed blocks are introduced. Unknown blocks should produce a visible safe placeholder, not crash the lesson.

## Failure states

The UI must distinguish:

- generation unavailable;
- invalid lesson;
- lesson not found;
- offline without a cached lesson;
- offline with a cached lesson.

A spinner must never be the only state for an indefinitely pending request.
