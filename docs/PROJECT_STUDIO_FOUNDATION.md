# Shadecode Student Project Studio

## Why this exists

Shadecode Student should not stop at lessons, revision, and examinations. Zimbabwe's school system uses school-based projects / continuous assessment across primary and secondary education, including projects that are staged, supervised, researched, presented, and evaluated.

ZIMSEC's public materials confirm that its remit covers assessment at both primary and secondary levels. Current Zimbabwe curriculum material also describes school-based projects from junior grades upward, with staged execution rather than a single "write an essay" event.

Project Studio makes Shadecode Student the student's project workspace and coach, not a project-answer generator.

## Core product principle

**Guide the learner through the work. Do not manufacture a submission that pretends the learner did the work.**

The system may generate scaffolding, explanations, checklists, examples, questions, planning aids, rubrics, formatting help, and feedback. It must clearly distinguish:

- learner-authored evidence
- teacher-provided requirements
- board/curriculum guidance
- AI-generated scaffolding
- sources/evidence actually supplied or verified by the learner

## Academic coverage

Project Studio must resolve the learner's actual academic context before applying a template:

- country
- board / curriculum
- academic stage
- grade / form / year
- subject / learning area
- project type
- teacher or school requirements when supplied

Never silently default a project to Cambridge, A-Level, or another board.

The first board-aware implementation should support the Zimbabwe school-based project pattern and remain extensible to other boards such as Cambridge.

## Project lifecycle

The default Zimbabwe school-based workflow is represented as an editable lifecycle, not hard-coded prose:

1. Problem identification
2. Investigation of related ideas
3. Generation of possible solutions / ideas
4. Selection and refinement of the chosen solution
5. Presentation of the final solution / results
6. Evaluation, recommendations, and reflection

Some syllabi split selection/refinement into separate scored stages. The data model therefore supports an arbitrary ordered stage list and board-specific mark allocations.

## What the learner gets

### 1. Project setup

- Choose subject / learning area.
- Enter or import the teacher's project brief.
- Select the board/curriculum and grade/form.
- Set due dates and milestones.
- Choose an approved/appropriate project direction.

### 2. Project coach

At every stage Cortex should answer:

- What am I supposed to do now?
- What evidence should I collect?
- What questions should I investigate?
- What should I write myself?
- What does the rubric appear to reward?
- What is missing from my work?
- What should I do next?

### 3. Evidence notebook

Capture real project evidence as the learner works:

- notes
- observations
- interviews
- questionnaire responses
- measurements
- calculations
- photographs
- sketches
- source records
- drafts
- prototypes
- teacher feedback
- presentation evidence

Evidence should be timestamped and linked to the project stage where practical.

### 4. Stage workspace

Each stage has:

- objective
- board/teacher requirements
- learner checklist
- evidence checklist
- working area
- reflection prompts
- progress state
- feedback
- rubric / marks where known

### 5. Project document builder

The learner can assemble a final project from their own work:

- cover page
- contents
- stage sections
- tables / figures
- references
- appendices
- acknowledgements where required

AI can help clean formatting, improve clarity, identify gaps, and explain why a change is suggested. It should not invent interviews, measurements, observations, citations, experiments, or community evidence.

### 6. Presentation mode

Turn the project into a presentation / viva preparation flow:

- concise project summary
- problem and motivation
- method
- findings
- solution
- limitations
- recommendations
- likely teacher questions
- learner practice

### 7. Evaluation and reflection

Prompt the learner to evaluate the actual solution, evidence, limitations, impact, and next steps.

## Primary-first UX

Project Studio must not look like a university dissertation tool for a Grade 3 learner.

The same underlying project engine should adapt its language, controls, examples, evidence expectations, and complexity by academic stage.

- Early primary: highly visual, short prompts, teacher/parent-supported evidence, simple artefacts.
- Junior/upper primary: structured stages, simple research instruments, charts/tables, reflection.
- Secondary: fuller investigation, documentation, analysis, design/refinement, references, presentation.
- A/Advanced level and tertiary: more rigorous research, technical documentation, analysis, citations, project management, and discipline-specific requirements.

## AI integrity rules

Project Studio must explicitly prevent fabricated evidence.

The assistant must not claim that the learner:

- interviewed a person they did not interview
- surveyed people they did not survey
- observed something they did not observe
- performed an experiment they did not perform
- measured a value they did not measure
- consulted a source they did not consult
- built/tested a prototype they did not build/test

When information is missing, Cortex should create an action such as **Collect this evidence** rather than filling the gap.

## Data model direction

The implementation should converge on entities along these lines:

- `projects`
- `project_stages`
- `project_evidence`
- `project_sources`
- `project_feedback`
- `project_artifacts`
- `project_templates`
- `project_rubrics`
- `project_milestones`

Board-specific templates and rubrics should be versioned and traceable to their source. Generated templates must not be represented as official board requirements unless verified.

## Integration points

Project Studio should integrate with existing Shadecode Student systems instead of becoming a parallel product:

- LearnerContext / academic-stage awareness
- curriculum and syllabus catalog
- Cortex
- StudySpace / mastery evidence
- tasks and reminders
- XP / achievements
- offline storage and sync
- document/export capabilities
- analytics

A project stage can create tasks. Completing genuine project work can contribute to progress/achievements without rewarding fabricated AI output.

## Initial vertical slice

Build the smallest useful end-to-end slice first:

1. Project Studio entry point.
2. Create project from learner academic context.
3. Add/select a teacher brief.
4. Render the six-stage Zimbabwe school-based project workflow.
5. Stage workspace with checklist + evidence capture.
6. Cortex coaching for the current stage.
7. Save project state locally and to the authenticated backend when available.
8. Generate a learner-owned final outline from captured work.
9. Integrity gate that blocks invented evidence from being presented as learner evidence.

Do not start by generating giant project reports. The workflow and evidence model are the foundation.

## Verification targets

Before calling this feature complete, verify:

- primary and secondary academic contexts route to appropriate project language
- board context is never guessed
- stage progress persists
- offline navigation/capture does not freeze
- learner evidence survives reload/sync
- AI cannot silently fabricate evidence
- final assembly contains traceable learner evidence
- accessibility and mobile layouts work
- existing lesson/exam flows are not regressed
