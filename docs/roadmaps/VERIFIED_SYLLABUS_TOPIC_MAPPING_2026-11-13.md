# Verified syllabus topic mapping in learner evidence

Date: 2026-11-13

## What changed

Canonical learning-event ingress now resolves the learner's configured curriculum on the server and attempts an exact match against the verified curriculum_knowledge topic layer.

- Only verified curriculum resolutions are eligible.
- Only topic knowledge records with verified provenance are considered.
- Matching is exact after the shared Unicode-aware label normalization. Accepted aliases are the topic title, verified knowledge key, or topic code.
- A single match attaches its canonical knowledge_key as curriculumTopicKey.
- Missing or ambiguous matches remain ordinary syllabus-scoped topic evidence; no guessed curriculum key is attached.
- Client-supplied topic keys are not trusted by the authenticated ingress.
- Server-side event emitters run the same resolver.
- The canonical projector now writes the verified key into the existing topic_mastery.curriculum_topic_key field.

The topic label remains available for display and grouping. The curriculum key is the stable syllabus-specific reference. No new mastery table was introduced.

## Current boundaries

- Fuzzy matching and model-generated mapping are intentionally excluded.
- Existing evidence is not retroactively assigned curriculum keys.
- This slice maps canonical learning events. Native exam completion outbox topic scores still need the same verified key mapping before the pipeline is fully unified.
- Learn assessment objective-level progress remains a separate consumer integration task; it should be reconciled with canonical events rather than double-counted.

## Verification

- Live catalog inspection confirmed 1,708 verified curriculum knowledge records and 1,380 verified curriculum objectives.
- The live catalog includes verified topic records with stable knowledge_key values (for example, Cambridge 0478 and 9700).
- Added unit coverage for exact match, no fuzzy match, ambiguity, and unverified curriculum.
- Source changes committed directly to main.
- TypeScript/Vitest execution and end-to-end authenticated event replay have not yet been run.