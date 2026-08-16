# Shadecode Learning Intelligence Architecture

**Status:** Strategic implementation specification
**Date:** 2026-08-16

## Purpose

Define the intelligence architecture behind Shadecode Student before adding more AI features. The goal is to turn longitudinal student evidence into useful, explainable personalization.

## 1. Core model

Cortex should maintain a student learning state composed of evidence, not guesses.

```text
Student
  ↓
Academic context
  ↓
Curriculum / knowledge graph
  ↓
Evidence
  ├── questions attempted
  ├── answers
  ├── marks
  ├── mistakes
  ├── lessons completed
  ├── study sessions
  ├── confidence
  └── revision history
  ↓
Knowledge state
  ├── mastery
  ├── confidence
  ├── recency
  ├── decay risk
  ├── misconception signals
  └── evidence strength
  ↓
Cortex decisions
  ├── explain
  ├── hint
  ├── practise
  ├── revise
  ├── schedule
  └── assess
```

## 2. Knowledge graph

The graph should connect existing academic entities rather than create competing parallel models.

```text
Education level
  ↓
Institution / qualification / programme
  ↓
Subject / course / module
  ↓
Topic
  ↓
Subtopic / skill
  ↓
Question / lesson / resource
  ↓
Attempt / error / assessment evidence
```

Each edge must have an explicit source and provenance where possible.

## 3. Student knowledge state

A topic state should be treated as a changing estimate backed by evidence.

Minimum conceptual fields:

- `mastery`: current estimated ability
- `confidence`: confidence in the estimate
- `evidence_count`: number of meaningful observations
- `last_evidence_at`: recency
- `decay_risk`: likelihood that performance has weakened through forgetting
- `misconception_signals`: observed recurring error patterns
- `source_types`: assessment, practice, lesson, self-report, etc.

Do not create a second mastery system if `topic_mastery` already provides the appropriate source of truth. Extend or adapt the existing model after auditing it.

## 4. Evidence hierarchy

Prefer stronger evidence over weaker signals.

1. Marked assessment performance
2. Repeated independent practice
3. Teacher/lecturer-provided assessment evidence
4. Structured lesson checks
5. Guided practice with limited assistance
6. Self-reported confidence
7. Generic engagement signals

A high-confidence claim should not be generated from a weak signal alone.

## 5. Progressive assistance

Cortex should optimize for independent capability.

```text
Full solution
    ↓
Worked step
    ↓
Targeted hint
    ↓
Concept reminder
    ↓
Minimal nudge
    ↓
Independent attempt
```

Assistance level should be informed by evidence of competence, not simply by the number of previous chats.

## 6. Personalization loop

```text
Observe → diagnose → select intervention → observe result → update state
```

Every intervention should have an observable outcome when practical.

Examples:

- hint → next attempt correctness
- revision recommendation → later recall
- lesson → concept check
- generated exam → topic-level performance

## 7. Exam intelligence

The assessment layer should eventually represent:

- examination/assessment
- paper/section
- question
- mark allocation
- curriculum mapping
- difficulty evidence
- command words
- question archetype
- student's attempt
- awarded mark
- error category

The system should distinguish evidence-backed assessment analysis from generated practice content.

## 8. Academic integrity

Cortex should distinguish learning assistance from answer substitution.

For learning contexts, assistance can increase understanding. For active assessments, the system should use graduated help and respect configured academic-integrity rules.

## 9. Tertiary education

The model must not assume secondary-school concepts such as a single subject per term. The generic academic layer should support:

- institution
- education level
- qualification/programme
- course/module
- semester/term
- credits where applicable
- assignments
- coursework
- labs/projects
- examinations
- research
- GPA/grade systems where applicable

Institution-specific integrations come after the generic model.

## 10. Offline compatibility

The learning state must be designed so useful operations can continue without a network connection.

Local-first candidates:

- cached curriculum graph
- recent knowledge state
- queued attempts
- question bank subsets
- lessons
- progress calculations
- deterministic recommendations
- local retrieval

Cloud candidates:

- advanced generation
- complex multimodal reasoning
- expensive model inference
- cross-device coordination

## 11. Non-negotiable rules

- Never fabricate mastery.
- Never claim a misconception without evidence.
- Never replace an existing source of truth with a duplicate model without an explicit decision record.
- Preserve provenance for curriculum and assessment data.
- Prefer deterministic calculations for deterministic facts.
- Keep student learning data separate from administrative views by default.
- Measure whether interventions improve outcomes before treating them as successful.
