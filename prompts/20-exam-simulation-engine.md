# SHADECODE STUDENT - EXAM SIMULATION ENGINE PROTOCOL

## PURPOSE

Use this prompt when building, improving, or expanding the Exam Simulation system.

The Exam Simulation Engine creates realistic exam preparation experiences.

It handles:

- exam generation
- timed practice
- marking
- feedback
- performance analysis
- readiness tracking

You must follow:

/prompts/00-master.md

For AI systems:

/prompts/04-ai-feature.md

For past papers:

/prompts/18-past-paper-intelligence.md

---

# CORE OBJECTIVE

Build an intelligent exam preparation system.

The system should answer:

"How prepared is this student, and what should they improve before the real exam?"

---

# PROBLEM

Students often:

- practise randomly
- underestimate weak areas
- lack exam experience
- do not analyse mistakes
- repeat the same errors

---

# PHASE 0: EXISTING SYSTEM ANALYSIS

Before changing anything:

Inspect:

- current exam simulation
- question generation
- timers
- marking system
- result storage
- analytics
- Cortex integration

Return:

## Exam Simulation Analysis

Current capabilities:

Missing capabilities:

Data available:

Required improvements:

Risks:

Do not code yet.

---

# SIMULATION TYPES

Support different modes:

## Practice Mode

Purpose:

Learning.

Features:

- untimed
- hints allowed
- explanations available

---

## Exam Mode

Purpose:

Realistic preparation.

Features:

- timer
- no assistance
- exam conditions
- final score

---

## Adaptive Mode

Purpose:

Personalised challenge.

System adjusts:

- difficulty
- topic selection
- question style

Based on:

- performance
- weaknesses
- goals

---

# EXAM GENERATION

Generated exams should consider:

Student:

- level
- syllabus
- weaknesses
- previous performance

Exam:

- subject
- duration
- marks
- difficulty
- question distribution

---

# QUESTION QUALITY RULES

Questions must be:

- syllabus aligned
- appropriate difficulty
- realistic
- educationally useful

Avoid:

- random questions
- incorrect solutions
- unrealistic difficulty

---

# MARKING SYSTEM

Marking should analyse:

Correctness:

Did they get the answer?

Method:

Was the approach valid?

Understanding:

Do they understand the concept?

Common mistakes:

What patterns appear?

---

# CORTEX INTEGRATION

After every simulation:

Cortex should update:

Knowledge:

- strong topics
- weak topics

Behaviour:

- timing problems
- careless mistakes

Recommendations:

- next revision steps
- practice suggestions

---

# RESULTS EXPERIENCE

After completion show:

Score:

Performance:

Strengths:

Weaknesses:

Comparison:

Improvement plan:

Do not only display a percentage.

---

# EXAM READINESS

System should estimate:

Readiness based on:

- recent performance
- consistency
- topic coverage
- difficulty handled

Avoid pretending predictions are guaranteed.

---

# DATABASE DESIGN

Store:

Exam:

- subject
- syllabus
- difficulty
- questions

Attempt:

- student
- answers
- score
- timing

Analysis:

- mistakes
- topics
- recommendations

---

# FAILURE HANDLING

Handle:

AI failure:

Use fallback.

Question generation failure:

Use stored questions.

Timer interruption:

Preserve progress.

Network loss:

Recover safely.

---

# IMPLEMENTATION RULES

Reuse:

- Past Paper Intelligence
- Universal Work Checker
- Cortex
- Analytics

Avoid:

- separate marking systems
- duplicate question databases

For major changes:

Use:

/prompts/15-migration.md

---

# TESTING

Test:

Easy exam:

Works.

Hard exam:

Works.

Student fails:

Provides useful guidance.

Student succeeds:

Increases challenge.

AI unavailable:

Fallback works.

Interrupted exam:

Recovery works.

---

# COMPLETION REPORT

Provide:

## Exam Simulation Engine Completed

Summary:

## Simulation Modes

List:

## Intelligence Added

List:

## Cortex Integration

Explain:

## Files Changed

List:

## Testing

Results:

STOP.

Do not continue automatically.
