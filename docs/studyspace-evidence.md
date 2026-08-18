# StudySpace learning evidence

StudySpace normalizes outcomes from every learning mode into `LearningEvidence`.

Sources currently supported by the shared contract: lesson, workmate, practice, assessment, exam and canvas. The evidence model intentionally accepts any subject and topic string.

The evidence layer is deterministic and provider-independent. AI/Cortex systems can enrich weak/strong areas later, but persistence and normalization must not depend on an AI provider being online.

Recommended flow:

1. Save the student's WorkObject locally.
2. Derive LearningEvidence from the saved object when an outcome is available.
3. Persist/sync evidence when connectivity allows.
4. Feed evidence to Cortex/adaptive recommendations.
5. Create the next StudySpace action from the recommendation.
