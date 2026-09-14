# Comp Lab Learning Evidence

Comp Lab uses deterministic evidence checks to help a learner see whether a project demonstrates a selected curriculum objective.

## What an evidence check is

An evidence check is a small, inspectable rule derived from curriculum wording. It can inspect project source for structures such as functions, selection, iteration, collections, input, output, error handling, object-oriented structures, or database operations.

The result is learning feedback, not an examination mark.

## Design rules

- Curriculum context comes from the learner's selected board, level, subject, syllabus, and current curriculum version.
- Checks should be deterministic and explainable.
- Checks should inspect the whole project, not only the visible editor tab.
- Language syntax must be considered before treating source as evidence.
- A passed structural check means evidence was found, not that the implementation is correct.
- A failed structural check means expected evidence was not detected, not that the learner necessarily failed the objective.
- Runtime execution and structural evidence remain separate signals.
- Comp Lab must never claim to reproduce official ZIMSEC, Cambridge, university, or professional marking schemes unless an explicitly licensed/validated assessment engine exists.

## Roadmap

1. Structural evidence from source.
2. Runtime evidence from executable tests.
3. Input/output and edge-case tests generated from objective constraints.
4. Project-graph-aware evidence across multiple files.
5. Learner history: repeated errors, attempts, mastery, and remediation.
6. Board-specific assessment adapters only where authoritative criteria are available.

The long-term goal is not a prettier code editor. It is an environment where writing, running, debugging, testing, explanation, and curriculum mastery form one continuous learning loop.
