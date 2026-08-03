# SHADECODE STUDENT - PAST PAPER INTELLIGENCE PROTOCOL

## PURPOSE

Use this prompt when building, improving, or expanding the Past Paper system.

The Past Paper Intelligence system should transform exam resources into an intelligent preparation engine.

It is responsible for:

- finding relevant papers
- organising papers
- analysing questions
- identifying patterns
- generating practice
- improving exam readiness

You must follow:

/prompts/00-master.md

For AI systems:

/prompts/04-ai-feature.md

For database:

/prompts/06-database.md

---

# CORE OBJECTIVE

Do not build a simple PDF library.

Build an exam intelligence system.

The system should answer:

"What should this student practise next to improve their exam performance?"

---

# PROBLEM

Students struggle with:

- finding the right papers
- knowing what topics appear often
- understanding examiner patterns
- marking their own work
- deciding what to revise

---

# TARGET SYSTEM

Past Paper Intelligence should provide:

## Discovery

Students can find:

- subject papers
- years
- variants
- topics
- difficulty

## Analysis

System understands:

- question topics
- mark allocation
- common patterns
- recurring concepts

## Practice

Students can:

- attempt questions
- receive feedback
- track improvement

## Recommendations

Cortex can suggest:

"Practice these questions because they target your weak areas."

---

# PHASE 0: EXISTING SYSTEM ANALYSIS

Before coding:

Inspect:

- current exam simulation
- document storage
- curriculum system
- AI features
- database structure

Return:

## Past Paper Analysis

Current capability:

Missing capability:

Possible architecture:

Data requirements:

Risks:

Do not code yet.

---

# DATA ACQUISITION STRATEGY

Avoid requiring users to manually upload everything.

Consider:

## Official Sources

Use legitimate sources where possible.

## User Contributions

Allow uploads with:

- verification
- organisation
- moderation

## Internal Indexing

Store metadata:

- subject
- syllabus
- year
- paper type
- topic

---

# PAPER INTELLIGENCE PIPELINE

Expected flow:

Paper Source

↓

Document Processing

↓

Question Extraction

↓

Topic Classification

↓

Metadata Storage

↓

Cortex Analysis

↓

Student Recommendations

---

# QUESTION UNDERSTANDING

The system should identify:

Question:

Topic:

Subtopic:

Skill tested:

Difficulty:

Marks:

Common mistakes:

Example:

Question:

Integration problem

Topic:

Calculus

Skill:

Applying integration methods

Difficulty:

Medium

---

# CORTEX INTEGRATION

Cortex uses paper intelligence to:

Identify weaknesses:

Student struggles with mechanics.

Recommend:

More mechanics questions.

Prepare exams:

Generate realistic practice.

Predict readiness:

Estimate confidence.

---

# STUDENT EXPERIENCE

Students should be able to:

Search:

"AS Physics electricity questions"

Receive:

Relevant questions.

After attempting:

Get:

- feedback
- explanations
- improvement suggestions

---

# AI RULES

AI should not blindly classify questions.

Validate:

- syllabus alignment
- topic accuracy
- difficulty

When uncertain:

Mark uncertainty.

---

# EXAM BOARD SUPPORT

Design for multiple systems:

Examples:

- Cambridge
- ZIMSEC
- other curricula

Do not hardcode one syllabus.

---

# DATABASE DESIGN

Store:

Paper:

- subject
- syllabus
- year
- type
- source

Question:

- extracted text
- topic
- marks
- difficulty

Student attempts:

- question
- performance
- mistakes
- progress

---

# IMPLEMENTATION RULES

When building:

Reuse:

- Cortex
- Exam Simulation
- Universal Work Checker

Avoid:

- duplicate question systems
- separate AI engines

If large migration required:

Use:

/prompts/15-migration.md

---

# TESTING

Test:

Search:

Find correct papers.

Classification:

Correct topic detection.

Recommendation:

Useful practice suggestions.

Student attempt:

Feedback works.

Missing paper:

System handles gracefully.

---

# COMPLETION REPORT

Provide:

## Past Paper Intelligence Completed

Summary:

## Supported Subjects

List:

## Data Sources

Explain:

## Cortex Integration

Explain:

## Student Benefits

List:

## Files Changed

List:

## Testing

Results:

STOP.

Do not continue automatically.
