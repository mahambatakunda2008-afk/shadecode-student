# SHADECODE STUDENT - SMART STUDY PLANNER PROTOCOL

## PURPOSE

Use this prompt when building, improving, or expanding the Smart Study Planner.

The Smart Study Planner creates personalised study plans using:

- student goals
- subjects
- available time
- exam dates
- learning progress
- weaknesses
- performance history

You must follow:

/prompts/00-master.md

For AI systems:

/prompts/04-ai-feature.md

For UI:

/prompts/05-ui-feature.md

---

# CORE OBJECTIVE

Build a planning engine that answers:

"What should this student study next, and why?"

The planner should not only schedule time.

It should optimise learning.

---

# PROBLEM

Students struggle with:

- deciding what to revise
- balancing subjects
- procrastination
- inefficient study sessions
- last-minute preparation

---

# PHASE 0: EXISTING SYSTEM ANALYSIS

Before changing anything:

Inspect:

- timetable system
- task system
- XP system
- exam simulation
- Cortex memory
- student analytics

Return:

## Planner Analysis

Current capabilities:

Missing intelligence:

Available data:

Required improvements:

Risks:

Do not code yet.

---

# PLANNER INPUTS

The planner may use:

## Student Information

- subjects
- level
- goals
- preferred study times

## Academic Data

- syllabus
- exam dates
- upcoming tests

## Performance Data

- weak topics
- mistakes
- Work Checker results
- exam scores

## Behaviour Data

- completed tasks
- consistency
- study habits

---

# PLANNING ENGINE

The planner should consider:

## Priority

High priority:

- weak topics
- upcoming exams
- important syllabus areas

Medium priority:

- regular revision

Low priority:

- already mastered topics

---

# STUDY SESSION DESIGN

A study session should include:

Subject:

Topic:

Duration:

Reason:

Activity:

Examples:

Physics

Electricity

45 minutes

Reason:

Weak area before exam

Activity:

Review concepts + solve questions

---

# CORTEX INTEGRATION

Cortex should provide intelligence:

Example:

Student:

Weak at calculus.

Exam in 3 weeks.

Planner:

Increase calculus practice.

Reduce mastered topics.

Schedule review sessions.

---

# ADAPTIVE PLANNING

The plan should change.

If student:

Completes tasks:

Increase difficulty.

Misses tasks:

Adjust workload.

Improves:

Move to harder topics.

Struggles:

Provide support.

---

# AVOID BAD PLANNING

Do not create:

Impossible schedules.

Example:

8 hours daily for a student with limited time.

Generic plans.

Example:

"Study everything equally."

Punishing systems.

Example:

Missing one day destroys progress.

---

# STUDENT EXPERIENCE

The student should see:

Today:

What should I do?

This week:

What is my goal?

Why:

Why was this recommended?

Progress:

Am I improving?

---

# GAMIFICATION CONNECTION

Planner may integrate with:

- XP
- streaks
- achievements

But:

Learning quality comes first.

Do not reward meaningless activity.

---

# DATABASE DESIGN

Store:

Plans:

- student
- date
- sessions

Sessions:

- subject
- topic
- duration
- completion

Feedback:

- completed
- skipped
- difficulty

---

# OFFLINE SUPPORT

Planner should handle:

- viewing saved plans
- completing tasks
- syncing progress

---

# IMPLEMENTATION RULES

When building:

Reuse:

- tasks
- timetable
- Cortex
- analytics

Avoid:

- duplicate scheduling systems
- isolated recommendation engines

If architecture changes:

Use:

/prompts/15-migration.md

---

# TESTING

Test:

New student:

Creates realistic plan.

Busy student:

Limited time.

Weak subject:

Receives focus.

Exam approaching:

Plan adapts.

Missed sessions:

Recovery works.

AI unavailable:

Fallback exists.

---

# COMPLETION REPORT

Provide:

## Smart Study Planner Completed

Summary:

## Intelligence Sources

List:

## Cortex Integration

Explain:

## Features Added

List:

## Files Changed

List:

## Testing

Results:

STOP.

Do not continue automatically.
