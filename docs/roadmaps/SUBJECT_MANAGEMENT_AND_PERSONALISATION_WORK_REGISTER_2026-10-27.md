# Subject Management and Learner Personalisation Work Register

**Last updated:** 2026-10-27  
**Status:** In progress. No end-to-end or production completion is claimed.  
**Scope:** Web subject management, shared learner profile, subject catalogue, curriculum selection, personalized learning, and Android alignment.

## User-visible problem

The current web `/subjects` page fetches the signed-in learner's subjects from `/api/learn` and renders those rows. It has no add-subject control. The onboarding subject options are hard-coded by study level in `src/components/onboarding/steps/SubjectStep.tsx` and do not yet constitute a complete, centrally maintained catalogue. A learner with Mathematics and Physics therefore sees only those selected/catalogued subjects, rather than a way to manage a broader subject set.

## Implementation record

### Completed in repository, not yet verified end-to-end

- [x] Inspected the existing web subjects page, onboarding subject step, learning API, subject normalization helpers, and profile-to-subject-catalog migration.
- [x] Added `src/app/api/subjects/route.ts` (commit `fbd3b388f3ec714939eb9842677046da9b7c6ae2`) as an initial authenticated POST endpoint to add a subject to the learner profile and ensure a corresponding subject catalog row exists.
- [ ] The new endpoint is **not yet verified** against production schema, RLS, profile upsert semantics, duplicate/concurrent requests, or the deployed app. Treat it as in progress, not shipped/complete.
- [ ] The web page has not yet been updated with the subject picker and add/remove UI. Consequently, users should not expect the web experience to have changed yet.

## Work remaining, in priority order

### P0: Make subject management real on web

- [ ] Audit and correct the new API route against the actual `profiles` and `subjects` schemas, existing auth conventions, RLS/grants, and trigger behavior. Prefer the established profile-to-catalog sync rather than maintaining two competing sources of truth.
- [ ] Define safe add/remove/update semantics. Avoid destructive profile overwrites and handle duplicate or concurrent requests idempotently.
- [ ] Add a searchable, grouped subject picker to `src/app/(app)/subjects/page.tsx`, including common subjects and a safe custom-subject option.
- [ ] Add/remove subjects from the signed-in learner's profile, refresh the displayed list after successful saves, and show loading, success, validation, and failure states.
- [ ] Make the empty state direct the learner to add subjects instead of only sending them back to Learn.
- [ ] Ensure newly added subjects flow into Learn and other modules, and do not imply lessons exist when lesson count is zero.
- [ ] Add tests for authenticated access, unauthenticated rejection, duplicates, invalid names, persistence, and isolation between learners.

### P1: Shared subject catalogue

- [ ] Replace hard-coded per-screen lists with a central catalogue and stable IDs.
- [ ] Include foundation/primary, lower-secondary, O Level, AS/A Level, university, TVET, professional, and independent-learning pathways.
- [ ] Expand language, humanities, social sciences, business, sciences, mathematics, technology, arts, and practical subjects.
- [ ] Support custom subjects without falsely assigning them a verified syllabus or generating unsupported curriculum claims.
- [ ] Record catalogue availability separately from verified curriculum coverage and published learning content.
- [ ] Keep subject naming and aliases canonical across onboarding, profiles, the subjects table, Learn, exam tools, and analytics.

### P2: Per-learner academic profile

- [ ] Let learners edit study level, qualification, exam board, syllabus/version, subject codes, language, institution/programme, and learning goals after onboarding.
- [ ] Keep per-subject curriculum metadata distinct where learners take subjects with different codes or specifications.
- [ ] Resolve curriculum only from supported, evidence-backed mappings. If unknown, ask or label unresolved rather than guess.
- [ ] Make the profile the shared personalization input for web and Android.

### P3: Adaptive learning

- [ ] Adapt vocabulary, explanation depth, prerequisite assumptions, examples, and assessment difficulty to the learner's level.
- [ ] Use demonstrated mastery and recurring mistakes, not age or level alone, to personalize.
- [ ] Respect subject-specific access: show relevant modules and tools only where they apply.
- [ ] Use only verified, scope-matching shared learning artifacts; do not treat another learner's private work as shared content.
- [ ] Keep learner memory private and user-scoped, with transparent controls and appropriate retention.

### P4: Cross-platform alignment and acceptance

- [ ] Align Android subject selection and profile persistence with the same catalogue/profile contract.
- [ ] Test web and Android add/edit/remove, refresh/relogin persistence, account switching, offline behavior, and error recovery.
- [ ] Test at least one foundation learner, a secondary learner, an AS/A Level learner with different subjects, and a university/TVET learner.
- [ ] Verify the deployed web commit matches the intended source commit before announcing availability.

## Acceptance criteria

A learner can sign in on web, add multiple subjects outside the initial Mathematics/Physics pair, remove or rename a custom subject safely, refresh/relogin without losing choices, and see those subjects reflected consistently in Learn. The selected education level and per-subject curriculum determine learning context. Unsupported or unverified curricula are labelled honestly. Another user's subjects and private learning data never leak into the current learner's account.

## Evidence required before marking complete

- Green relevant CI/build for the exact commit.
- API tests and schema/RLS review.
- Successful deployed web test of add, duplicate, refresh, and remove/edit paths.
- Cross-account isolation check.
- Curriculum/subject coverage status recorded separately from UI availability.
