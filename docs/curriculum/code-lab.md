# Code Lab: objective-first curriculum contract

Code Lab is not a generic coding playground. For syllabus-bound learners it is an execution layer over the verified curriculum system.

## Scope chain

`learner identity -> board -> qualification -> level -> syllabus/version -> subject -> verified objectives -> mapped skills -> Code Lab activity`

A Code Lab activity must never infer curriculum scope from a subject name alone.

## Activity classes

- **Examinable**: exact curriculum identity, verified objective mapping, and verified provenance. These can be presented as required syllabus work.
- **Enrichment**: useful coding practice that is intentionally outside the required syllabus scope. It must be labelled as enrichment and must not affect claims about syllabus completion.
- **Unverified**: incomplete or unproven mapping. It is blocked from required syllabus work.

## ZIMSEC O-Level Computer Science first

The first production content target is the ZIMSEC O-Level Computer Science learner profile discussed in the product roadmap. The Code Lab data model is board-neutral so Cambridge, other ZIMSEC subjects, TVET, university and professional tracks can be added without creating a second curriculum engine.

The repository must not ship guessed syllabus objectives. Objective statements and mappings become publishable only after their authoritative source and version have been verified.

## Progression

Code Lab recommendations respect activity prerequisites. A prerequisite is considered satisfied only when the learner has completed it or reached the configured mastery threshold. Recommendations prefer unfinished, lower-mastery, required activities before enrichment.

## Coverage

`objectiveCoverage()` is deliberately explicit. It reports how many activities map to each verified objective so curriculum gaps can be found before content is released.

## Required guardrails

1. Exact board and qualification match.
2. Exact level, syllabus and syllabus version match.
3. Exact subject match.
4. Objective IDs must exist in the learner's verified objective set.
5. Required activities need verified objective mapping.
6. Required activities need verified provenance.
7. Enrichment must never be silently classified as examinable.
8. Missing objective coverage is a content gap, not permission to invent objectives.

This contract is shared with the broader curriculum resolver. Code Lab should consume the resolved curriculum context rather than maintaining a parallel syllabus database.
