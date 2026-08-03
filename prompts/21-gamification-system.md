# SHADECODE STUDENT - GAMIFICATION SYSTEM PROTOCOL

## PURPOSE

Use this prompt when building, improving, or expanding Shadecode Student's gamification systems.

The gamification system includes:

- XP
- levels
- streaks
- achievements
- challenges
- leaderboards
- progress rewards

You must follow:

/prompts/00-master.md

For UI:

/prompts/05-ui-feature.md

For database:

/prompts/06-database.md

---

# CORE OBJECTIVE

Create motivation systems that encourage meaningful learning.

The system should answer:

"How do we help students build better learning habits?"

Not:

"How do we keep students clicking?"

---

# GAMIFICATION PRINCIPLE

Learning comes first.

Rewards are feedback.

Points are not the goal.

Reward:

- understanding
- consistency
- improvement
- effort
- progress

Avoid rewarding:

- meaningless activity
- spam actions
- shortcuts

---

# PHASE 0: EXISTING SYSTEM ANALYSIS

Before changing anything:

Inspect:

- XP system
- achievements
- streak logic
- leaderboard
- tasks
- analytics
- user profiles

Return:

## Gamification Analysis

Current features:

Working systems:

Broken systems:

Missing systems:

Risks:

Do not code yet.

---

# XP SYSTEM

XP should represent meaningful progress.

Possible XP sources:

Learning:

- completing lessons
- solving problems
- reviewing topics
- finishing exams

Improvement:

- fixing mistakes
- mastering weak topics

Consistency:

- maintaining study habits

---

# XP RULES

Avoid:

XP farming.

Example:

Opening the app repeatedly.

Low-value actions receiving high rewards.

Infinite reward loops.

Every XP source needs:

Action:

Why it matters:

Reward amount:

Abuse prevention:

---

# LEVEL SYSTEM

Levels should represent progress.

Consider:

- increasing difficulty
- milestones
- achievements

Avoid:

Levels that only measure app usage.

---

# STREAK SYSTEM

Streaks should encourage consistency.

Rules:

Missing one day should not destroy motivation.

Consider:

- recovery options
- flexible schedules
- realistic expectations

---

# ACHIEVEMENT SYSTEM

Achievements should celebrate meaningful milestones.

Examples:

Learning:

"Completed first practice session"

Improvement:

"Improved exam score"

Consistency:

"Studied for 7 days"

Mastery:

"Mastered a topic"

Avoid:

Random achievements with no meaning.

---

# DAILY CHALLENGES

Challenges should support learning.

Examples:

Complete:

- 5 physics questions
- review a weak topic
- attempt exam section

Avoid:

Tasks designed only to increase engagement.

---

# LEADERBOARD RULES

Leaderboards can motivate but can also discourage.

Consider:

Different rankings:

- improvement
- consistency
- achievement

Avoid:

Only rewarding highest scores.

A struggling student should still have ways to succeed.

---

# CORTEX INTEGRATION

Cortex can recommend:

Challenges:

Based on goals.

Rewards:

Based on progress.

Motivation:

Based on behaviour.

Example:

Student struggles with physics.

Cortex:

Creates physics challenge.

Rewards improvement.

---

# DATABASE DESIGN

Store:

User Progress:

- XP
- level
- streak

Achievements:

- available achievements
- unlocked achievements

Events:

- action
- timestamp
- reward

---

# SECURITY RULES

Prevent:

- fake XP requests
- client-side reward manipulation
- leaderboard cheating

Validate important events server-side.

---

# IMPLEMENTATION RULES

Reuse:

- tasks
- analytics
- Cortex
- student profile

Avoid:

- separate progress systems
- duplicate XP logic

For major changes:

Use:

/prompts/15-migration.md

---

# TESTING

Test:

New student:

Starts correctly.

Active student:

Progress works.

Inactive student:

Recovery works.

Abuse attempt:

Cannot farm rewards.

Large XP values:

System remains stable.

---

# COMPLETION REPORT

Provide:

## Gamification System Completed

Summary:

## Reward Systems Added

List:

## XP Sources

List:

## Cortex Integration

Explain:

## Files Changed

List:

## Testing

Results:

STOP.

Do not continue automatically.
