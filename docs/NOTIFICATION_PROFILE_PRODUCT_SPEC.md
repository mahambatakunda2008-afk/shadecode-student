# Profile and Notifications

## Profile

Profile is the student's identity and control center, not another academic selector.

It shows:
- identity and avatar;
- current academic context;
- subjects;
- learning goals;
- mastery and study statistics;
- XP, streak and achievements;
- notification preferences;
- privacy/account controls.

Academic context changes are deliberate and must warn about their effect on curriculum-scoped recommendations. Never silently change the context from a feature screen.

## Context locking

After onboarding, curriculum-dependent screens consume the saved context. They do not expose unrelated stage/qualification options.

Example: a Cambridge AS & A Level student sees their configured AS/A Level syllabus and subjects in Exam Simulation, not Primary, Lower Secondary, GCSE or unrelated boards.

A context switch lives in Profile/Academic Settings and requires explicit confirmation. Historical progress remains associated with its original context.

## Notifications

Notification center supports:
- lesson ready;
- exam ready;
- exam result;
- study reminder;
- streak/achievement;
- Cortex insight;
- deadline;
- announcement;
- system/offline sync status.

Every notification should carry a destination when one exists. Preferences are category-based and default to useful academic signals without engagement spam.

The system should support unread counts, read state, timestamps, grouping and deep links.

## Design principle

The learner should feel that Shadecode is aware of their current academic world. Global product settings remain global; curriculum controls remain inside academic settings.
