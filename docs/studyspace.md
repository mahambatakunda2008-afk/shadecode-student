# StudySpace

StudySpace is Shadecode Student's universal workspace for learning, working, practice, assessment and exams.

## Architecture

StudySpace owns the durable `WorkObject` while modes provide different experiences:

- Workmate: understand, check, solve and teach schoolwork.
- Practice: focused question work.
- Assessment: graded work with marks and feedback.
- Exam: timed, distraction-minimal examination surface.
- Canvas: free-form writing, diagrams and reasoning.

A subject is optional. Workmate and StudySpace must not use a hard-coded subject whitelist. Subject detection and curriculum-specific behavior belong in Cortex and curriculum data.

## Offline-first rule

A WorkObject is saved locally before relying on network services. Cloud analysis can enhance work, but loss of connectivity must not destroy the student's current work.

## Future integrations

StudySpace should become the shared surface for quizzes, Exam Simulation, assignments, Workmate, collaborative study, teacher review, and Cortex assessment feedback rather than creating separate persistence models for each feature.
