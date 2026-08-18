# StudySpace foundation

StudySpace is the shared persistence and workspace boundary for learning activities. It defines a durable `WorkObject` rather than forcing every feature to invent its own attempt/work model.

## Modes

- `workmate`: bring questions, answers, working, images or other schoolwork for checking, solving and teaching.
- `practice`: focused question work.
- `assessment`: graded work with marks and feedback.
- `exam`: timed examination work.
- `lesson`: generated or curriculum lesson work, including lesson-linked questions, responses and revision activity.
- `canvas`: free-form writing, diagrams and reasoning.

Subject is intentionally optional. Do not create a hard-coded subject whitelist in StudySpace. Subject detection and curriculum-specific behavior belong in Cortex and curriculum data.

## Lesson generation and learning loop

Lesson generation is an existing Cortex capability, not a replacement feature. The generated lesson should become a StudySpace learning context when a student enters, practices, revises or asks questions about it. `lessonId` provides the durable link back to the lesson while the WorkObject records the student's actual activity.

This enables the eventual loop:

`lesson generation -> lesson -> practice -> response -> WorkObject -> Cortex analysis -> remediation -> next lesson`

The lesson generation API is cloud/AI work and therefore cannot be assumed to run offline. The student's saved lesson activity can and should remain available offline. Existing lesson download/offline infrastructure should be reused rather than duplicated.

## Offline-first rule

A WorkObject is saved locally before relying on network services. Cloud analysis can enhance work, but loss of connectivity must not destroy the student's current work.

## Future integrations

StudySpace should become the shared surface for quizzes, Exam Simulation, assignments, Workmate, teacher review, collaborative study and Cortex assessment feedback rather than creating separate persistence models for each feature.
