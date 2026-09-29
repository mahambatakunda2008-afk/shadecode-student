# Cambridge International AS & A Level Chemistry 9701 (2025–2027)

## Status

**Verified teaching-source layer complete.** The official 2025–2027 syllabus has been normalized into the repository curriculum dataset and live knowledge layer.

Official source:

https://www.cambridgeinternational.org/Images/664563-2025-2027-syllabus.pdf

The official syllabus is Version 1, published September 2022, for examinations in 2025, 2026 and 2027. Cambridge describes the syllabus as emphasizing conceptual understanding, application in novel contexts and advanced practical skills.

## Verified repository dataset

- Dataset: `src/lib/curriculum/data/cambridge-9701-2025-2027.json`
- Source watch: `cambridge-as-a-level-chemistry-9701-2025-2027`
- Curriculum version: `3d7f2e44-0e2d-4b66-9f7a-0c4d1c5b8a11`
- Topics: **37**
- Official subsection hierarchy: **91 subsections**
- Normalized numbered learning outcomes: **351**
- Curriculum objectives: **388** (37 topic objectives + 351 numbered outcome objectives)
- Live knowledge rows: **606**
- Live levels: **324 AS / 282 A Level knowledge rows**
- All 351 learning outcomes have canonical objective mappings.
- No AS/A Level content leakage was detected.

## Knowledge layer

The verified knowledge seed includes the complete resolver vocabulary already used by the curriculum runtime:

- topic
- content_scope
- learning_outcome
- assessment_requirement
- assessment_weighting
- competency
- constraint
- examination_format
- guidance
- note
- paper_component
- practical_activity
- prerequisite
- progression
- project_requirement
- resource
- skill
- terminology

The normalized learning outcomes intentionally paraphrase the official numbered outcomes rather than copying the syllabus verbatim.

## Important hierarchy corrections

During extraction, the draft scope layer was audited against the official PDF and corrected:

- AS Topic 6 has only subsection **6.1 Redox processes**. Electrolysis belongs to A Level Topic 24.
- A Level Topic 32 contains **32.1 Alcohols** and **32.2 Phenol**.
- A Level Topic 34 contains **34.1 Primary and secondary amines**, **34.2 Phenylamine and azo compounds**, **34.3 Amides**, and **34.4 Amino acids**.
- A Level Topic 35 contains **35.1 Condensation polymerisation**, **35.2 Predicting the type of polymerisation**, and **35.3 Degradable polymers**.

These corrections were made before the verified seed was committed.

## Assessment structure

The official assessment has five components:

- Paper 1: Multiple Choice, 40 marks, 1 hour 15 minutes
- Paper 2: AS Level Structured Questions, 60 marks, 1 hour 15 minutes
- Paper 3: Advanced Practical Skills, 40 marks, 2 hours
- Paper 4: A Level Structured Questions, 100 marks, 2 hours
- Paper 5: Planning, Analysis and Evaluation, 30 marks, 1 hour 15 minutes

AS candidates use Papers 1–3. A Level candidates use all five components. citeturn15view0

## Runtime boundary

Chemistry is now eligible to serve as a verified curriculum knowledge source. The runtime should resolve topics and outcomes through the canonical curriculum layer rather than topic-name fallbacks.

Exam-history evidence remains a separate concern: past-paper, mark-scheme, examiner-report and grade-threshold coverage is not claimed merely because the syllabus is verified.

## Reproducible seed

`supabase/migrations/20260929152000_seed_cambridge_9701_knowledge.sql`

This migration recreates the verified Chemistry objectives and knowledge rows from the normalized dataset representation.

