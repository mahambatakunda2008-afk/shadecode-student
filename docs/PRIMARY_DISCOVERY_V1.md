# Primary Discovery v1 — Implementation Contract

**Status:** Ready for implementation  
**Issue:** #261  
**Date:** 2026-09-01

## Product intent

Primary is a first-class Shadecode experience for younger learners. It must not be a secondary-school dashboard with larger controls. The product language, interaction model, activity length, feedback style, rewards and safety boundaries are intentionally different.

## First release learning loop

`My Day → Choose/receive activity → Attempt → Friendly feedback → Learning event → Mastery evidence → Next activity`

The loop must work with locally available content and must not require an AI/network request for basic completion, scoring or persistence.

## Primary information model

Minimum conceptual entities:

- Learner
- Education context
- Grade/year
- Curriculum/board
- Subject
- Topic
- Skill
- Activity
- Attempt
- Learning event
- Mastery evidence
- Learning pack

Reuse canonical learning events and the existing mastery system. Do not introduce a Primary-specific scoring database.

## Initial subject surface

Start with four curriculum-facing areas:

1. Mathematics
2. English / Reading
3. Science
4. Local-language learning

The architecture should allow later additions without redesigning the shell.

## Primary activity types

### Mathematics
- number recognition;
- counting;
- arithmetic;
- patterns;
- fractions;
- measurement;
- shapes;
- word problems;
- mental-maths rounds.

### Reading / English
- phonics;
- letter/word recognition;
- spelling;
- sentence construction;
- short reading passages;
- comprehension;
- vocabulary;
- story continuation.

### Science
- classification;
- observation;
- sequencing;
- simple experiments;
- diagrams;
- prediction → observation → explanation activities.

### Local language
- vocabulary;
- picture/word matching;
- reading;
- simple sentence construction;
- translation/meaning activities where appropriate.

## UX principles

### Child-facing language

Prefer:
- My Day
- Adventures
- Things To Do
- Practice
- Try Again
- Let's Explore
- I Wonder
- Great Work

Avoid exposing:
- mastery_score;
- retention risk;
- intervention factor;
- evidence count;
- model/provider terminology.

### Interaction

Prefer:
- tap;
- drag;
- match;
- sort;
- draw;
- listen;
- speak;
- choose;
- short typed responses.

Use text-heavy forms sparingly for early learners.

### Feedback

Never shame incorrect answers. Feedback should make the next attempt obvious.

Examples:
- "Not quite. Try counting the groups again."
- "Good start. What number comes next?"
- "You found it!"

## Cortex boundary

Primary Cortex should be an age-appropriate tutor and guide. It may explain, ask questions, provide hints and adapt activity difficulty.

The deterministic application remains authoritative for:
- scores;
- attempts;
- completion;
- mastery evidence;
- progression rules;
- synchronization state.

AI must not fabricate curriculum facts, grades or learner evidence.

## Offline-first requirements

For a downloaded learning pack, the following must work without network access:
- open Primary;
- browse activities;
- start an activity;
- complete an activity;
- receive deterministic feedback;
- save the attempt;
- update local progress;
- resume later.

Synchronization can occur later. Network-dependent AI is an enhancement, not the foundation of the loop.

## Safety boundaries

Primary mode should default to:
- restricted discovery of external content;
- no open public messaging;
- controlled collaboration;
- age-appropriate AI responses;
- parent/teacher visibility according to explicit permissions;
- clear memory/privacy controls;
- no hidden collection or sharing of child learning data.

## Reward model

Primary should emphasize visible learning progression rather than competitive ranking.

Candidate rewards:
- stars;
- stickers;
- collections;
- badges;
- world-building unlocks.

Rewards must be attached to meaningful learning actions. Avoid rewards for simply opening the app.

## V1 shell

Proposed navigation:

- **My Day** — today's recommended activities and progress.
- **Adventures** — subjects/topics represented as explorable areas.
- **Create** — drawing, stories and simple projects.
- **My Progress** — child-friendly achievements and skill growth.
- **Library** — locally available stories/resources.

Parent/teacher administration should not compete with the child shell.

## V1 acceptance criteria

- A Primary learner can enter a dedicated experience without seeing secondary/tertiary terminology.
- At least one Mathematics and one Reading activity can complete end-to-end.
- Completion produces canonical learning evidence.
- Progress is persisted locally and survives refresh/restart.
- Core activity completion works offline after content is available locally.
- Cortex can consume the resulting evidence without becoming the source of truth.
- Existing secondary/Cambridge/ZIMSEC flows remain unaffected.
- Automated tests cover the learning-event mapping and the core activity state transitions.

## Deferred from V1

Do not block the first implementation on:
- full 3D/world engine;
- P2P networking;
- voice AI;
- handwriting AI;
- advanced computer vision;
- school-local server;
- marketplace;
- full virtual laboratory;
- national competitions.

These are roadmap capabilities, not prerequisites for proving the Primary learning loop.
