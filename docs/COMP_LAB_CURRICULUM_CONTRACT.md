# Comp Lab Curriculum Contract

Comp Lab is curriculum-aware, not exam-board-hardcoded.

## Canonical learning chain

`board -> qualification/level -> subject -> syllabus -> objective -> skill -> exercise -> evidence`

The runtime is independent of the board. Curriculum metadata decides what the learner should learn and which exercise is appropriate.

## Contexts

- School
- Secondary
- Sixth form
- University
- Polytechnic
- Professional development

## Algorithm objective layer

The current board-neutral objectives include:

- Input, output and assignment
- Sequential problem solving
- Selection
- Iteration
- Arrays and lists
- Procedures and functions
- Tracing and dry runs
- Algorithm testing
- Algorithm efficiency
- Algorithm representation

These are competency labels, not official syllabus wording.

## Board mapping rule

A curriculum adapter may map an official syllabus objective to one or more canonical Comp Lab objectives. The adapter must preserve the original board, syllabus version, objective identifier and source reference.

No exercise should be presented as officially aligned merely because its topic sounds similar. Alignment requires a verified curriculum source.

## Why this matters

A ZIMSEC learner, Cambridge learner, university learner and professional learner can use the same algorithm runtime while receiving different objectives, examples, difficulty, terminology, assessment expectations and progression paths.

This lets Comp Lab scale across curricula without turning the runtime into a collection of board-specific hacks.
