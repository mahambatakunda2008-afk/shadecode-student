# Tertiary Support: Current-State Audit

Date: 2026-08-16

This document supersedes any earlier tertiary audit statements that describe onboarding or academic context as completely missing.

## Verified implementation already present

The live repository already has a meaningful tertiary foundation:

- `OnboardingFlow` supports University, Polytechnic/TVET and Professional study levels.
- `WelcomeStep` collects institution, programme/qualification, year/level, semester/term and courses/modules for post-secondary learners.
- `mapOnboardingFormData()` maps University → `university` and TVET/Professional → `tvet`.
- `/api/onboarding/complete` authenticates the user, writes `user_profiles`, and upserts `academic_contexts` for university/TVET learners.
- `/api/academic-context` already provides authenticated read/update access to the learner's context.
- `academic_contexts` exists in Supabase, is currently empty in the audited production database, and has owner-scoped RLS.
- `AcademicContext`, `AcademicCourse`, `AcademicAssessment` and `CourseMaterial` types already exist.
- `src/lib/academic/postSecondary.ts` already contains post-secondary helper logic.

## What is actually missing

The gap is therefore not "add university onboarding". The remaining work is to turn the existing tertiary foundation into a deeper academic system:

1. Replace the current `courses text[]` representation with normalized course/module records when consumers are mapped.
2. Add academic-period records where a single text semester is no longer sufficient.
3. Add coursework/assignment/practical/project assessment records.
4. Feed tertiary deadlines into Mission Control/study planning.
5. Connect course/module topics to the existing mastery system without creating a duplicate mastery graph.
6. Feed verified institution/programme/course context into Cortex.
7. Add institution-aware grading and credits before attempting GPA intelligence.
8. Add tertiary past-paper/assessment provenance and curriculum mapping.

## Important source-of-truth distinction

There are currently two profile layers:

- `profiles`: legacy/core learner state and dashboard/game data.
- `user_profiles`: canonical onboarding education-level, learning-goal and subject-interest state.

The onboarding completion API writes `user_profiles.onboarding_completed`. The server onboarding guard must therefore read `user_profiles`, not `profiles`.

## Security verification

The audited `user_profiles` table has owner-scoped SELECT/INSERT/UPDATE policies using `auth.uid() = user_id`.

The audited `academic_contexts` table has owner-scoped SELECT/INSERT/UPDATE/DELETE policies using `auth.uid() = user_id`.

No duplicate tertiary context table should be introduced.

## Next implementation target

The next engineering step is **course/module normalization**, but only after auditing every current consumer of `academic_contexts.courses`. The migration must preserve existing string-array data and avoid breaking current onboarding users.
