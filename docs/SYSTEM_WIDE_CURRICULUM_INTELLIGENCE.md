# System-Wide Curriculum Intelligence

Curriculum intelligence is a Shadecode Student platform capability, not a Code Lab feature.

## Consumers

The same resolved curriculum context may be consumed by:

- Cortex AI and tutoring
- Learn lessons and learning paths
- Exam Simulation and marking
- Past Papers / Exam Hub
- Code Lab
- Math Checker / work checking
- Daily Challenges and practice
- Focus and study planning
- Timetable recommendations
- Progress and analytics
- Achievements and mastery
- future subjects, boards and tertiary education experiences

## Identity contract

Every curriculum-specific claim resolves through:

`Board -> Qualification -> Level -> Syllabus -> Syllabus Version -> Subject -> optional Paper/Component`

Subject-only or level-only inference is not sufficient for an examinable claim.

## Knowledge layers

The knowledge graph may contain objectives, topics, content scope, competencies, learning outcomes, practical activities, projects, assessment requirements, paper components, assessment weightings, examination format, terminology, skills, prerequisites, progression, resources, constraints, guidance and notes.

Objectives are one layer of the syllabus, not the syllabus itself.

## Safety / correctness

- Official authoritative documents are the source of truth.
- Newly ingested knowledge is draft by default.
- Unresolved syllabus versions cannot become verified curriculum claims.
- Version conflicts require verification.
- Archived knowledge is excluded from current curriculum context.
- Verification requires provenance and mapping status.
- No module may silently substitute a different board, syllabus or version.

## Product principle

**One curriculum intelligence layer, many learning experiences.**

Modules should consume resolved curriculum context rather than implementing their own syllabus parsing or board-specific rules.
