# Comp Lab Curriculum Binding

Comp Lab has two distinct alignment states:

- **Practice:** board-neutral exercise and competency language. This is safe to ship without claiming official syllabus alignment.
- **Official:** an exercise is mapped to a verified board, qualification, level, subject, syllabus identifier, syllabus version, objective identifier, objective label and source reference.

## Canonical chain

`board -> qualification/level -> subject -> syllabus -> objective -> skill -> exercise -> evidence`

The execution runtime does not change when curriculum changes. Curriculum metadata selects the appropriate exercise, terminology, progression and assessment expectations.

## Security rule

A binding with missing metadata, an empty source reference, or `verified: false` must remain practice-only. Client UI must not describe such an exercise as an official exam-board question or marking scheme.

## Adding an official mapping

1. Obtain the current official syllabus or curriculum source.
2. Record the exact board, qualification, level, subject and syllabus version.
3. Record the source's objective identifier and wording.
4. Map it to a canonical Comp Lab objective.
5. Preserve the source reference.
6. Mark the binding verified only after the source has been checked.
7. Add tests for both a matching context and a non-matching context.

This contract intentionally does not invent ZIMSEC, Cambridge or university mappings. Those should be added from verified curriculum material, not inferred from topic similarity.
