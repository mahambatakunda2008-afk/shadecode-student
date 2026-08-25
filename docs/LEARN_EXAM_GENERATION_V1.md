# Learn + Exam generation v1

The generation boundary is shared by Learn and Exam. A request must carry the authenticated learner context, enrolled subject, topic, pedagogical difficulty and, when available, a verified curriculum node.

The boundary rejects incomplete onboarding, un-enrolled subjects, stage mismatches, subject mismatches and syllabus-version mismatches.

Prompts receive explicit curriculum grounding. When a verified node is absent, generation must not claim syllabus alignment.

Cache identity includes stage, board, qualification, syllabus code/year, subject, topic, difficulty, curriculum node and generation version.

This is deliberately a boundary layer. Existing route-specific generation remains in place until each route is wired and regression-tested against this contract.
