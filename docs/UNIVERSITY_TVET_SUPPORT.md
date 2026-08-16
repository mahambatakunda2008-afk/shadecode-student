# University and Polytechnic/TVET Support

## Purpose

Shadecode Student supports three academic environments without forcing them into one curriculum model:

- Secondary: exam-board/curriculum driven (ZIMSEC, Cambridge, etc.)
- University: programme, year, semester, course/module and assessment driven
- Polytechnic/TVET: programme, module, theory, practical, workshop and coursework driven

## Product principle

Do not build a universal database of every university curriculum first. Academic structure varies substantially between institutions. Start with a user-owned academic context and course/module model. Add structured curriculum packs only where demand justifies them.

## University learner model

`institution → programme → year → semester → courses/modules → concepts/materials → assessments → attempts → mastery`

A course can contain lecturer notes, slides, PDFs, assignments, readings, past papers and generated learning artifacts. Cortex should use this material as the student's course context.

## Polytechnic/TVET learner model

`programme → modules → theory/practical/workshop → coursework/tests/exams → mastery`

Assessment types include assignments, projects, quizzes, tests, exams, practicals, labs, workshops, presentations and reports.

## Cortex direction

Recommendations must eventually operate across courses, deadlines, mastery, workload and assessment type. The goal is to answer `what should I work on next?`, not merely identify a weak school subject.

## Current foundation

- `AcademicContext` and `AcademicCourse` types exist in `src/lib/curriculum/types.ts`.
- Onboarding preserves A-Level as secondary education.
- University/TVET onboarding can carry optional institution, programme, year, semester and courses metadata.
- Cortex snapshots can carry post-secondary academic context.
- Existing secondary curriculum intelligence remains intact.

## Next implementation stages

1. Add first-class post-secondary onboarding UI.
2. Persist and edit academic context.
3. Build course/module workspace.
4. Add course-material ingestion and retrieval.
5. Add assessment/deadline planning.
6. Ground Learn, Exam Simulation and Cortex in course context.
7. Add multi-course adaptive scheduling.
8. Measure university/TVET activation, retention and paid conversion.

## Guardrails

- Never map A-Level to university.
- Never require a national curriculum for university/TVET users.
- Never destroy the existing secondary learner experience.
- Prefer user-owned course material over fabricated curriculum data.
- Keep low-data/offline support in the architecture.
