# Universal learner context

Academic context is a product-wide invariant, not an Exam Simulation feature.

Every academic operation should receive the same context:

- stage
- curriculum board
- qualification
- syllabus code
- syllabus year
- enrolled subjects

## Applies to

- Dashboard recommendations
- Learn
- Exam Simulation
- Practice
- Daily Challenges
- Cortex chat/tutor/teacher
- Lesson generation
- Question generation
- Canvas suggestions
- Math Checker interpretation
- Analytics and mastery
- Leaderboard context where academic filters are relevant
- Timetable recommendations
- Tasks and study plans
- Achievements when curriculum-specific
- Books and reading context
- Notifications
- Search/discovery
- Offline cache keys

## Product rule

Do not expose a global academic selector inside individual features. Features inherit context from the learner profile. Cross-context exploration is an explicit, separate action and must never silently change generation context.

## Server-side rule

Client UI filtering is not sufficient. APIs must validate subject/context against the authenticated learner before generating, retrieving, saving or scoring academic content.

## Cache rule

Any generated academic artifact must be keyed by all context dimensions relevant to generation, plus model/prompt version where applicable. Topic-only cache keys are forbidden for curriculum-aware content.
