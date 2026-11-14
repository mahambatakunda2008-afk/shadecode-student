# Cortex Verify: learning from verified work

## Purpose

Cortex Verify must not behave like a stateless answer box. Each marked attempt should improve the learner's private academic model so later explanations, revision choices and practice questions become more useful.

This is **personalized learner-model training**, not training shared foundation-model weights. Student work is not silently pooled to fine-tune a global model.

## Evidence flow

1. A student submits work in Mark Mode.
2. Cortex returns a structured mark result.
3. Only scored results update the local learner model.
4. The learner model aggregates evidence by subject and, when supplied, a verified syllabus topic.
5. Lost-mark notes become recurring misconception signals. Criteria with no lost marks are not treated as mistakes.
6. The next local-model request receives a compact learner context and is instructed to adapt explanation style, revisit recurring errors and prefer fresh transfer questions over repeating the same question.
7. When online, the client also submits an authenticated `question.attempted` event to `/api/intelligence/events`. The canonical event pipeline persists it and projects topic mastery only when a topic identity can be verified.

## What is stored locally

- Subject/topic aggregate
- Number of marked attempts
- A heuristic mastery estimate
- The eight most recent scores
- Counts of recurring lost-mark notes
- Last practice timestamp

Raw student answers, source images and full AI explanations are not copied into the learner model. Exact reusable responses are handled separately by the private Verify result cache.

## What the model does

- Spots recurring error patterns across attempts.
- Changes the next explanation to address those patterns.
- Recommends revisiting weak areas.
- Encourages a new question testing the same skill instead of endlessly repeating an identical question.
- Avoids claiming mastery from one attempt.

The mastery estimate uses a simple 70/30 exponential moving average. It is a heuristic signal, not a validated psychometric score and not a replacement for official assessment.

## Privacy and reliability

- Local learner-model data is scoped to the signed-in browser profile.
- Server-side topic mastery uses the existing authenticated canonical learning-event pipeline and per-user database policies.
- A failed local write or event request must never block marking.
- Cached results are not counted as new evidence: only a fresh marked attempt updates the learner model.
- Offline attempts update the local learner model. Cross-device synchronization of those offline learner signals remains future work.
- No training of shared model weights occurs through this feature.

## Next engineering stages

1. Supply canonical syllabus topic keys from the question/curriculum picker wherever available.
2. Add authenticated retrieval and synchronization of compact learner-model aggregates across devices.
3. Build a visible, editable learner profile showing strengths, recurring misconceptions and evidence behind each estimate.
4. Feed the learner model into question selection, lesson sequencing, spaced retrieval and offline practice.
5. Add model calibration and decay/recovery rules using longitudinal evidence, not arbitrary one-attempt thresholds.
6. Add controls to inspect, export and clear learner-model data.

