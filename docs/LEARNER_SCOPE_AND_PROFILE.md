# Learner scope, onboarding and profile

## Core rule

Onboarding establishes the learner's educational context. The rest of the application should consume that context instead of repeatedly asking the learner to choose an education level.

An advanced-secondary/A-Level learner should not see Primary, Lower Secondary, GCSE or unrelated qualification choices inside Exam Simulation, Learn, syllabus navigation, or recommendations unless an explicit educator/admin feature permits it.

## Onboarding

Collect only what is needed, in a progressive flow:

1. Display name / preferred name.
2. Learner stage.
3. Curriculum board.
4. Qualification / programme.
5. Syllabus year/version where relevant.
6. Subjects.
7. Optional school and study preferences.

The stage and curriculum choices should cascade. Do not show every global option at once.

Example:

`Advanced Secondary -> Cambridge -> AS & A Level -> 9702 -> Physics`

An A-Level student should then see Physics 9702-related choices throughout the app, not a global list containing Primary and unrelated boards.

## Changing level

The learner can change their education context from Profile / Academic Settings. This should be an intentional action with a confirmation because it changes recommendations, exams, curriculum coverage and potentially cached content.

Past progress should not be silently deleted. Archive the previous academic context and allow the learner to switch back.

## Profile

Profile should contain:

- avatar;
- display name;
- academic context;
- subjects;
- syllabus versions;
- learning goals;
- streak and XP summary;
- achievements;
- mastery overview;
- study preferences;
- notification preferences;
- offline/downloaded content;
- privacy and account controls.

## Navigation

Navigation should be context-aware. If a learner is in A Level mode, labels and actions should reflect that context. Avoid cluttering the primary navigation with options irrelevant to their stage.

## Notifications

In-app notifications should be first-class and deep-link to the relevant feature. Examples include study reminders, lesson-ready events, exam results, achievements, streaks, deadlines, Cortex insights and announcements.

Notifications must respect user preferences and should not become spam. High-value academic events should be prioritized over engagement nudges.
