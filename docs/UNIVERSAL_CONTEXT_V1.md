# Universal academic context v1

This slice establishes the learner academic context as a shared product invariant.

Generation and retrieval code must use the authenticated learner context for stage, board, qualification, syllabus code/year and enrolled subjects. Individual features should not expose unrelated academic-level selectors.

Context completeness is required before curriculum-grounded generation. Academic cache keys include the relevant context and artifact version so identical topics from different syllabus versions cannot collide.
