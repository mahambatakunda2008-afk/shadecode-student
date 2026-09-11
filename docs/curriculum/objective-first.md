# Objective-First Curriculum Contract

Shadecode Student is curriculum-aware by learner identity, not by AI guesswork.

## Canonical chain

```text
Learner identity
  -> verified board
  -> qualification
  -> education level
  -> syllabus + version
  -> subject
  -> verified syllabus objectives
  -> verified objective-to-skill mappings
  -> verified syllabus knowledge
  -> lesson / practice / assessment
```

The system must never use this weaker chain:

```text
Student asks about a topic -> AI guesses the syllabus -> AI invents the scope
```

## What is authoritative?

For curriculum-bound learners, the following order is mandatory:

1. **Learner identity**: the profile's curriculum identity is the source of truth.
2. **Board and qualification**: the exact examining/curriculum authority must match.
3. **Level**: the learner's actual qualification level must match.
4. **Syllabus and version**: the exact syllabus identifier and version must match a verified, effective curriculum version.
5. **Subject**: the exact subject identity must match.
6. **Objectives**: at least one verified syllabus objective must exist before curriculum-aware teaching is permitted.
7. **Knowledge**: verified syllabus knowledge, when available, is used to explain and teach the objectives. It is not allowed to expand the required scope by itself, and it is not a hard prerequisite: verified objectives alone are sufficient scope authority, since requiring a full knowledge pack in addition would block objective-first teaching for every subject where knowledge extraction hasn't caught up yet.
8. **Assessment**: examples and assessment guidance must remain consistent with the resolved curriculum context.

## Fail-closed behavior

A curriculum-aware request is blocked when:

- the learner curriculum identity is incomplete;
- no verified effective curriculum version matches the identity; or
- no verified syllabus objectives exist for that exact identity.

Whole-syllabus knowledge being absent does not block resolution on its own -- it only reduces how much supplemental grounding the generator has beyond the verified objective statements themselves.

The AI must not silently fall back to a generic lesson and label it board-aligned.

A learner without a configured curriculum identity can still use non-curriculum learning features. That content must not be presented as verified board/syllabus content.

## All-level support

The architecture is designed to support different education families without forcing every learner into an O-Level model:

- **Foundation**: ECD and Primary.
- **School**: Lower Secondary, O-Level/IGCSE, AS-Level and A-Level.
- **Beyond School**: University, Polytechnic/TVET and Professional learning.

School examination pathways require verified board/syllabus objectives. Tertiary and professional pathways can use verified course/module learning outcomes where the curriculum pack models them, without pretending they are school examination objectives.

## Zimbabwe-first requirement

For ZIMSEC learners, the system must resolve the learner's exact ZIMSEC qualification, level, syllabus, version and subject before generating curriculum-bound teaching. In particular, ZIMSEC O-Level learners must be served from the verified O-Level syllabus/objective set for their subject, not from a generic international Computer Science or Mathematics curriculum.

The same architecture can host Cambridge and other boards by adding their verified curriculum packs. A board must never be selected merely because the topic resembles a known syllabus.

## Objective-first lesson rule

For a curriculum-grounded Learn request, Cortex receives:

- exact curriculum identity;
- the authoritative verified objectives;
- verified syllabus knowledge;
- topic-level grounding where available.

The generation prompt explicitly treats the objectives as the scope gate. If the requested topic is outside the verified objectives, it must be labelled as **enrichment**, not silently promoted to required syllabus content.

## Code Lab

Code Lab activities should store curriculum metadata using `CodeLabActivityMetadata`:

- `curriculum`
- `objectiveIds`
- `mappingVerified`
- `enrichment`

An activity is **examinable** only when it has a complete curriculum identity, verified objective mapping, objective IDs, and is not marked enrichment. Otherwise it is either enrichment or unverified.

## Shared-system contract

This is not a Code Lab-only feature. The same resolved curriculum context is intended for:

- Learn
- Exam Sim
- Past Papers / Exam Hub
- Practice and challenges
- Cortex tutoring
- curriculum progress
- analytics and mastery
- future assessment and recommendation systems

Any new curriculum-aware module should use the system curriculum gateway rather than implementing its own board/syllabus/version filtering.

## Current implementation

- `src/lib/curriculum/objective-first.ts` defines objective and activity metadata.
- `src/lib/curriculum/resolver.ts` resolves exact learner identity, verified versions, objectives, mappings and knowledge.
- `src/lib/curriculum/system-resolver.ts` is the system-wide fail-closed gateway.
- `src/lib/curriculum/system-curriculum-context.ts` exposes verified objectives and knowledge to downstream systems.
- `src/lib/curriculum/ai-grounding.ts` builds authoritative curriculum prompt context for Cortex.
- `src/app/api/learn/generate/route.ts` blocks curriculum-bound generation when the objective-first context cannot be verified.

## Data quality rule

A curriculum pack is not considered production-ready merely because its syllabus name exists. It needs authoritative source provenance, a verified version, verified objectives, and verified mappings/knowledge before it can drive examinable learning.
