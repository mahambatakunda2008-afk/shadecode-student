# Code Lab Implementation Status

## Objective

Code Lab is being implemented as a curriculum-aware practical Computer Science environment. The capability library may be broad, but curriculum teaching and exam claims are gated by verified syllabus objectives.

## Non-negotiable flow

`Learner -> Exam Board -> Qualification/Level -> Syllabus + Version -> Subject -> Verified Objectives -> Mapped Skills -> Activity -> Assessment`

A programming language, database tool, GUI framework, web technology, or other capability must not become an exam-required learning item merely because Code Lab supports it.

## First implementation slice

1. Keep the existing legacy curriculum types intact while introducing the objective-first domain beside them.
2. Add explicit curriculum identity and provenance types that can represent all planned education levels.
3. Add an objective-first activity gate that can distinguish `examinable`, `enrichment`, and `unverified` content.
4. Add a source register so every syllabus-backed objective can carry board, qualification, syllabus/version, source document, retrieval/review date, and mapping status.
5. Add ZIMSEC O Level Computer Science (4021) as a first-class curriculum target, but **do not invent or label syllabus objectives until the current official ZIMSEC syllabus document has been retrieved and reviewed**.

## ZIMSEC O Level source status

ZIMSEC currently publishes Computer Science 4021 examination materials on its official website, including papers 4021/01, 4021/02 and 4021/03. These confirm the active subject code and paper structure, but exam papers are not a substitute for the syllabus specification. The implementation therefore treats the official syllabus as the source of truth for objective mappings.

The official ZIMSEC site is the required authority for future objective ingestion. Third-party copies may be used only as discovery aids and must not automatically become curriculum truth.

## Next slices

### Slice 2: curriculum data

- Add verified ZIMSEC 4021 syllabus/version records.
- Add objective records with exact provenance.
- Add shared Computer Science skill records.
- Add explicit objective-to-skill mappings.

### Slice 3: learner context

- Resolve exam board, qualification/level, syllabus version, subject, optional paper/component, and exam session from the learner's education profile.
- Persist a stable curriculum-context identifier for analytics and Cortex.

### Slice 4: Code Lab gating

- Require resolved curriculum context before curriculum-specific claims.
- Require verified objective mapping before an activity can be marked `examinable`.
- Keep unmapped capability content visibly separate as enrichment/unverified.

### Slice 5: assessment + Cortex

- Attach objective IDs to practice, practical tasks, tests, and analytics events.
- Pass the resolved curriculum context and objective IDs into Cortex.
- Prevent Cortex from presenting unverified content as required exam content.

## Acceptance rule

If the system cannot answer **which learner, which board, which qualification/level, which syllabus version, which subject, and which verified objective** an exam claim belongs to, it must not make that claim.
