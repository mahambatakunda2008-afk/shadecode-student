# Shadecode Student learning loop

The StudySpace intelligence loop is intentionally local-first and provider-independent:

```text
Lesson / Workmate / Practice / Assessment / Exam / Canvas
                         ↓
                  LearningEvidence
                         ↓
                   LearnerProfile
                         ↓
                AdaptiveRecommendation
                         ↓
                    ActionRoute
                         ↓
                     StudySpace
                         ↓
                    New evidence
```

## Current contracts

- `src/lib/studyspace/evidence.ts` normalizes WorkObjects into learning evidence.
- `src/lib/studyspace/profile.ts` aggregates evidence by subject + topic and derives mastery/trend.
- `src/lib/studyspace/profile-adaptive.ts` selects the next action without crossing subject boundaries.
- `src/lib/studyspace/next-action.ts` converts recommendations into existing StudySpace routes.
- `src/lib/studyspace/lessonEvidence.ts` gives lessons deterministic WorkObject IDs so completion can become evidence without duplicate records.
- `src/components/studyspace/StudyCanvas.tsx` provides an offline-first scratch surface for working, diagrams, equations and reasoning.

## Offline rules

1. Navigation and local work must remain usable without a network.
2. Canvas state is stored on-device and does not require an AI/network request.
3. Generated content can require connectivity unless that lesson has already been downloaded/cached.
4. Server writes must be retryable. Do not discard a student's completed work because a request failed.
5. Evidence identifiers should be deterministic where the source object has a stable identity.

## Subject safety

Recommendations are scoped by `subject + topic`. A topic with the same name in two subjects is not the same learning area.

## Lesson generation

Adaptive lesson routes reuse the existing Learn page and generation pipeline. They pass subject/topic context instead of introducing a parallel lesson UI or AI provider.
