# Curriculum-grounded generation contract

All new academic generation should use `GenerationContext`.

## Academic identity

Generation receives the authenticated learner's stage, board, qualification, syllabus code/year and enrolled subjects. These are not trusted from a free-form client field.

## Topic grounding

When a verified curriculum node exists, generation receives its title, learning outcomes, command words, assessment objectives and practical skills. If no verified node exists, Cortex must not claim syllabus alignment.

## Difficulty

`foundation | standard | challenging | exam` describes pedagogical/exam difficulty only. It must never represent the learner's qualification or academic stage.

## Quality gate

Before content is persisted or cached, validate scope and curriculum alignment. Future quality gates should also verify completeness, diagrams where pedagogically useful, worked examples, retrieval practice, misconceptions, exam relevance and curiosity/extension content.

## Cache identity

Cache keys must include learner academic context, curriculum node/version, generation version and pedagogical difficulty. A topic string alone is insufficient.
