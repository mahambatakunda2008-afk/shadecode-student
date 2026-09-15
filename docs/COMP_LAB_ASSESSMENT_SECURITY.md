# Comp Lab Assessment Security

Comp Lab has two different assessment modes and they must not be confused.

## 1. Practice assessment

Browser execution may use exercise-owned visible and hidden cases for immediate feedback. This is suitable for learning, debugging, tracing and low-stakes practice.

Hidden cases in a browser bundle are **UI-hidden, not secret**. A technically capable learner can inspect shipped JavaScript and recover them. They must therefore never be treated as secure exam questions or authoritative evidence.

## 2. Authoritative assessment

For timed exams, graded assignments, school reporting and any evidence that affects mastery or progression, test definitions and expected outputs must remain server-side.

The intended flow is:

`learner artifact -> authenticated assessment request -> server/runtime -> protected tests -> result -> signed evidence -> Learning Graph`

The client receives only the minimum result needed for feedback. It must not receive protected inputs or expected outputs before submission.

## Required properties

- Protected cases are stored outside the client bundle.
- The client cannot choose or modify the authoritative expected output.
- Each assessment run has a unique attempt ID.
- Server results include the exercise/objective version used for grading.
- Evidence records pass counts, hidden-pass counts, timing and assessment version.
- Replaying an old client bundle cannot change authoritative assessment rules.
- Runtime failures are distinguished from learner failures.
- Official exam marking is never claimed unless the assessment has actually been mapped and validated against the relevant board's published criteria.

## Current boundary

The current Algorithm Workbench is a browser-first learning surface. Its hidden cases provide useful practice resistance but are not a secure exam system. A future server-authoritative assessment service should replace those cases for high-stakes workflows without changing the learner-facing exercise model.
