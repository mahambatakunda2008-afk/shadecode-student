# SHADECODE STUDENT - UNIVERSAL WORK CHECKER PROTOCOL

## PURPOSE

Use this prompt when building, improving, or replacing the Work Checker system.

The Universal Work Checker is a cross-subject student reasoning analysis engine.

It is NOT a homework answer machine.

Its primary purpose:

Understand the student's attempt.

Find mistakes.

Explain weaknesses.

Improve learning.

You must follow:

/prompts/00-master.md

For AI work:

/prompts/04-ai-feature.md

For UI:

/prompts/05-ui-feature.md

---

# CORE OBJECTIVE

Transform the existing Math Checker into:

Universal Work Checker.

Supported subjects:

- Mathematics
- Physics
- Computer Science
- Chemistry
- Biology
- Other academic subjects

The system should understand:

"What did the student try to do?"

Not only:

"What is the final answer?"

---

# MODES

The system has two main modes.

# MODE 1: CHECK STUDENT WORK

Default mode.

Student provides:

- image
- text
- solution attempt
- explanation
- calculations

System analyses:

## Understanding

Did the student understand the concept?

## Method

Was the approach correct?

## Steps

Where did reasoning become incorrect?

## Final Answer

Is the conclusion correct?

## Improvement

How can the student improve?

Output:

- mistakes
- explanations
- hints
- corrections
- learning recommendations

---

# MODE 2: SOLVE AND TEACH

Student requests a full solution.

System provides:

- method
- reasoning
- explanation
- examples

Rules:

Do not simply provide an answer.

Teach the process.

---

# PHASE 0: EXISTING SYSTEM ANALYSIS

Before modifying:

Inspect:

- current Math Checker
- image upload system
- OCR/image processing
- AI integration
- Cortex connection
- subject systems

Return:

## Work Checker Analysis

Current features:

Existing capabilities:

Missing capabilities:

Required changes:

Risks:

Do not code yet.

---

# AI ARCHITECTURE

All analysis must flow through Cortex.

Flow:

Student Submission

↓

Work Checker

↓

Cortex

↓

Subject Understanding

↓

Reasoning Analysis

↓

Feedback Generation

↓

Learning Memory Update

---

# SUBJECT ENGINE DESIGN

The checker should support subject-specific reasoning.

## Mathematics

Analyse:

- formulas
- algebra
- calculations
- graphs
- proofs
- methods

## Physics

Analyse:

- equations
- units
- assumptions
- diagrams
- explanations

## Computer Science

Analyse:

- algorithms
- logic
- code structure
- efficiency
- debugging

---

# FEEDBACK DESIGN

Feedback should be educational.

Bad:

"Wrong."

Good:

"Your formula choice was correct, but the substitution step used the wrong value."

Every response should include:

## What you did well

## Where the issue is

## Why it happened

## How to improve

---

# IMAGE ANALYSIS

For uploaded work:

Handle:

- handwriting
- diagrams
- equations
- code screenshots

If unclear:

Ask for clarification.

Never pretend to understand unreadable work.

---

# LEARNING MEMORY

Important discoveries can update Cortex memory.

Examples:

Student repeatedly:

- confuses units
- makes algebra mistakes
- misunderstands concepts

Store useful learning patterns.

Do not store every single answer.

---

# ANTI-CHEATING PRINCIPLE

The Work Checker should improve learning.

Default:

Guide.

Explain.

Teach.

Avoid becoming:

"Upload question → receive answer."

---

# ERROR HANDLING

Handle:

- unclear image
- unsupported subject
- AI failure
- missing context

Never leave:

blank response.

---

# IMPLEMENTATION RULES

When building:

- reuse existing Math Checker infrastructure
- preserve working upload systems
- connect through Cortex
- avoid duplicate AI logic

If replacing architecture:

Use:

/prompts/15-migration.md

---

# TESTING

Test:

Correct solution:

Should recognise success.

Small mistake:

Should identify issue.

Major misunderstanding:

Should teach concept.

Unreadable image:

Should request clearer input.

Wrong subject:

Should adapt.

AI failure:

Fallback works.

---

# COMPLETION REPORT

Provide:

## Universal Work Checker Completed

Summary:

## Supported Subjects

List:

## Modes Implemented

List:

## Cortex Integration

Explain:

## Files Changed

List:

## Testing

Results:

## Future Improvements

List:

STOP.

Do not continue automatically.
