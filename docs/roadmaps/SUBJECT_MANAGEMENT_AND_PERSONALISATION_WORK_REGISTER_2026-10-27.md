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


## Full product requirements captured from the discussion (2026-10-27)

This section is the source of truth for the requested outcome. It expands the checklist above so future implementation does not collapse into adding two or three more hard-coded subjects.

### Product outcome

Shadecode is a personalized learning-control system, not a Mathematics/Physics-only app and not a flat catalogue of subject cards. A learner must be able to select the areas they actually study, set the right academic context for each subject, and see that context carry through relevant web and native Android workflows. Subject availability, verified curriculum coverage, published learning content, and working tools are separate states and must be shown honestly.

### Learner pathways to support

- [ ] Early childhood / foundation learning areas.
- [ ] Primary.
- [ ] Lower secondary.
- [ ] Upper secondary / O Level.
- [ ] AS Level and A Level, including subject combinations that differ by learner.
- [ ] University and polytechnic, including programme, year, semester, and courses where relevant.
- [ ] TVET / vocational and practical programmes.
- [ ] Professional learning and independent/self-directed learning.
- [ ] A learner can explore a subject outside their formal school subjects without changing their formal qualification profile.

Do not infer a person's level from their age alone. Permit learners to edit their level and academic context after onboarding.

### Initial subject taxonomy to cover

This is a breadth requirement for a centrally maintained catalogue, not a claim that every syllabus or lesson is already verified. Add aliases and region-specific names without creating duplicate canonical subjects.

- **Mathematics and quantitative:** Mathematics, Additional Mathematics, Further Mathematics, Statistics, numeracy, quantitative methods, technical mathematics.
- **Sciences and environment:** Integrated Science, General Science, Biology, Chemistry, Physics, Environmental Science, Agriculture, Applied Science, Earth Science, Astronomy, and appropriate foundation science areas.
- **Computing and technology:** Computer Science, ICT, Computing, programming/coding, software development, digital literacy, Design and Technology, engineering-related study areas.
- **Languages and communication:** English Language, English Literature, reading, writing, Shona, Ndebele, other languages, communication and academic writing.
- **Humanities and social sciences:** History, Geography, Religious Studies, Sociology, Psychology, Philosophy, Global Perspectives, citizenship/social studies.
- **Business and commerce:** Business Studies, Business Management, Economics, Accounting, Commerce, Entrepreneurship, Finance, Marketing.
- **Creative and practical fields:** Art and Design, Music, Drama, Media Studies, Physical Education, sport, hospitality, food/nutrition, and other practical subjects.
- **Higher education / professional courses:** allow course/programme-based subjects and custom course labels rather than forcing every course into a school-subject list.
- **Custom subjects:** a learner can add a subject not yet in the catalogue. Custom does not mean a syllabus has been verified, learning content exists, or AI can safely generate accurate material for it.

The catalogue should be extensible and searchable, grouped by category and optionally filtered by learner pathway. Do not hide a valid subject just because it is not a typical choice for the currently selected level; show a warning or ask for context if needed instead of silently excluding it.

### Curriculum context and truth labels

For each learner and, where needed, each subject, retain the applicable fields:

- education/study level and qualification;
- exam board or provider (for example Cambridge, ZIMSEC, Edexcel, IB, or another explicitly selected provider);
- syllabus/subject code and syllabus version or year;
- subject-specific paper/component where applicable;
- institution, programme, year, semester, or course for tertiary/TVET learners;
- preferred language and learning goals;
- curriculum-resolution status and evidence/provenance.

Requirements:
- [ ] Support different boards, qualifications, syllabus codes and versions across different subjects in the same learner profile.
- [ ] Do not assume one syllabus code applies to every selected subject.
- [ ] If the board, code or syllabus version is unknown or unsupported, preserve the learner's selection but mark curriculum context unresolved/partial and ask only for the missing detail when needed.
- [ ] Maintain separate, evidence-backed statuses for **selectable subject**, **curriculum mapped**, **curriculum verified**, **published learning assets available**, and **feature/tool supported**.
- [ ] Never fabricate syllabus topics, exam-paper structure, official outcomes, lesson counts, mastery, or coverage percentages to make an empty subject look complete.
- [ ] Track curriculum version changes and the evidence/source used to verify coverage.

### Personalization contract

Use a shared learner-context contract across web and native Android. Relevant modules should consume the same canonical subject IDs, learner level, per-subject curriculum, language and goals instead of maintaining unrelated hard-coded assumptions.

- [ ] Match explanation vocabulary, depth, prerequisite assumptions, examples, and question difficulty to the learner's chosen level and demonstrated understanding.
- [ ] Use actual learner evidence such as attempts, misconceptions, repeated errors, confidence and demonstrated mastery; do not personalize solely by age, grade or a self-reported label.
- [ ] Let the learner choose a goal: exam preparation, improving grades, conceptual understanding, skill development, projects, career development or exploration.
- [ ] Let learners choose structured or flexible study, a daily time goal and preferred language where supported.
- [ ] Subject-specific modules should appear only when relevant. For example, Geography case studies belong in Geography workflows, and practical/code tools should be offered where they fit the selected subject.
- [ ] A new subject with no verified content should still be manageable, but show an honest empty/limited state and safe next actions. Do not imply a generated lesson or syllabus-backed experience is ready.
- [ ] AI is optional, not the source of truth. Prefer verified local/shared content and deterministic tools where suitable; use provider generation only with validation and a clear fallback.
- [ ] Shared generated content can be reused only when it is explicitly eligible for sharing, validated, licensed/allowed, and matches the subject, syllabus, version, language and learner purpose. Never reuse another learner's private notes, answers, mistakes or memory as shared content.
- [ ] Keep personal learning memory private, learner-scoped and subject-aware, with transparent controls and retention rules.

### Cross-platform and public-product distinction

The recent Snap & Extract work is in the native Android codebase. It does not automatically change the deployed web app. The web subject-management work must be implemented and deployed separately. Android should subsequently align with the same subject catalogue and profile contract; do not claim parity until the actual native flows have been checked.

- [ ] Web: subject picker, add/remove/custom subject, profile context editor, clear saving/error states, responsive and accessible UX.
- [ ] Web: ensure Learn and other subject-aware modules consume persisted selections after refresh and a new session.
- [ ] Android: same learner choices and persistence semantics, with local/offline behavior clearly defined.
- [ ] Cross-platform: sync without overwriting newer data, preserve local work when offline, resolve conflicts visibly and isolate accounts.
- [ ] Public landing page and documentation must describe current supported capabilities accurately; planned catalogue breadth is not current verified curriculum coverage.

### Implementation order and gates

1. **Audit source of truth first:** profile schema, subjects schema, migrations/triggers, RLS/grants, existing API auth patterns, and every consumer of subjects. Decide whether profile data or the per-user subjects table is canonical, and document the synchronization contract before adding more writes.
2. **Stabilize the initial API:** review src/app/api/subjects/route.ts (commit fbd3b388f3ec714939eb9842677046da9b7c6ae2) against real schema and authorization. It is a draft implementation only until its profile upsert and subject-row insert behavior, race handling and RLS are proven. Avoid partial success that leaves profile and subject rows inconsistent.
3. **Ship usable web subject management:** add searchable grouped picker and safe add/remove/custom subject controls, then test persistence and learner isolation.
4. **Create the central catalogue and canonical IDs:** replace per-screen duplicated lists, add aliases and category/pathway metadata, and keep custom subjects possible.
5. **Connect academic profile and curriculum resolution:** per-subject board/qualification/code/version; edit after onboarding; no guessed mappings.
6. **Wire personalization:** confirm Learn, exam tools, revision, progress, content retrieval and other relevant modules consume the shared context and correctly gate subject-specific features.
7. **Align Android and offline behavior:** same subject contract, durable local state where supported, honest sync/offline indicators.
8. **Validate and release:** relevant CI, schema/RLS review, automated tests, deployed web test, Android test, account isolation, and evidence recorded in this register and the master register.

### Required test matrix

- [ ] New learner at foundation/primary level with several learning areas.
- [ ] Lower-secondary learner with a mixed subject combination.
- [ ] O Level learner whose subjects use different syllabus codes.
- [ ] AS/A Level learner with a non-default combination, such as Geography/Economics/Computer Science rather than Mathematics/Physics.
- [ ] University or polytechnic learner with programme/year/semester/courses.
- [ ] TVET/professional learner.
- [ ] Independent learner adding a subject not in the standard catalogue.
- [ ] Duplicate add (including case and alias variations), invalid/blank/oversized name, add/remove failure, retry and concurrent submission.
- [ ] Refresh, sign out/sign in, account switching, offline selection and reconnect.
- [ ] Subject appears consistently in web Subjects, Learn, and the relevant tools; empty content does not look like ready content.
- [ ] User A cannot read or mutate User B's subject choices, curriculum profile or private learning records.
- [ ] Keyboard/screen-reader operation, small mobile viewport, light/dark theme and reduced-motion behavior.

### Current status snapshot

- The web /subjects page currently only renders the learner's returned subject rows; no usable add-subject UI is present in the inspected source.
- Onboarding choices remain hard-coded in src/components/onboarding/steps/SubjectStep.tsx; the list is level-dependent and incomplete as a universal catalogue.
- An initial authenticated POST route was committed at src/app/api/subjects/route.ts in commit fbd3b388f3ec714939eb9842677046da9b7c6ae2. It has not yet been schema/RLS audited or tested end-to-end.
- The web page, central catalogue, edit-after-onboarding profile flow, curriculum resolution, personalization integration, Android alignment, and deployed acceptance tests remain incomplete.
- Do not announce a web fix until a deployed web test demonstrates it.


### Schema/source-of-truth findings from the first audit (2026-10-27)

- Migration 20260916104000_sync_profile_subjects_to_subject_catalog.sql explicitly declares the selected-subject array on public.profiles as the canonical source and uses a trigger to synchronize it into public.subjects for modules that need subject UUIDs.
- The trigger maps known onboarding IDs to display labels and falls back to title-casing other values. It inserts missing subject rows and removes the legacy General row, but the inspected trigger does not delete stale subject rows when a subject is removed from the profile.
- Migration 20260926180000_canonicalize_subject_names.sql adds a unique index on (user_id, lower(trim(name))) and rewires existing learn_lessons/tasks references to the earliest duplicate row before deleting duplicate catalog rows.
- Therefore, add/remove must not treat public.profiles.subjects and public.subjects as unrelated competing sources of truth. Add must preserve the profile array contract and rely on or safely reconcile the trigger-created row. Remove requires an explicit safe plan for existing lesson/task foreign-key references and stale catalog rows; do not blindly delete a subject row.
- The initial POST route now uses an authenticated server Supabase client and updates only the signed-in user's profiles row. However, it still needs review for concurrent array updates, the exact custom-subject representation, duplicate/race behavior with the trigger and unique index, and API tests. This is not yet a verified implementation.
- Relevant code already exists for post-onboarding curriculum editing: src/app/api/curriculum/profile/route.ts exposes authenticated GET/PATCH for exact curriculum identities stored on profiles.curriculum_subjects. The new UI should reuse this contract where it fits rather than inventing a parallel curriculum-profile API.
- Existing onboarding persists several related but distinct stores: profiles (canonical learner profile and subject IDs), user_profiles (education level/subject interests), academic_contexts (tertiary/programme details), learning_paths, and profiles.curriculum_subjects (exact per-subject curriculum identities). The broader work must define how these stay aligned instead of silently assuming they are one table.


## Implementation progress update (2026-10-27, source changes committed; verification pending)

- [x] Added central selectable catalogue at src/lib/subjects/catalog.ts with canonical IDs, categories, aliases and pathway metadata across the main subject families. The catalogue deliberately does not assert verified syllabus or lesson coverage.
- [x] Connected the web subject picker in src/app/(app)/subjects/page.tsx to the central catalogue, searchable by name/alias. Entries associated with the learner's current study level are sorted first; other subjects remain selectable.
- [x] The web picker supports adding catalogued subjects and a custom subject name, with save/error feedback and a refresh from /api/learn after successful writes.
- [x] Added an active-subject removal control. It asks for confirmation and describes that existing work is preserved.
- [x] Extended src/app/api/subjects/route.ts with authenticated DELETE behavior. It removes the selection from the signed-in learner's canonical profile array but intentionally does not delete the subjects row, because existing lesson/task records may reference its UUID. /api/learn filters the visible list using the profile selection.
- [x] Canonicalized common catalogue aliases in the add/remove route to reduce duplicate subject selections.
- [x] Added src/lib/subjects/catalog.test.ts to test stable IDs/names, breadth across pathways/categories, aliases, and separation between selectable status and verified-content claims.
- [ ] CI for the latest commit and the new test have not yet been confirmed passing.
- [ ] The add/remove flow has not been exercised against production schema/RLS or a deployed account; concurrency, trigger behavior and account isolation still need validation.
- [ ] Profile/curriculum editing and full adaptive personalization are not implemented by these UI changes. They remain later stages in this register.
- [ ] The web change is not declared live until the exact commit is deployed and checked in the browser.

### Important scope boundary

This first pass makes the subject list manageable and broadens selectable choices. It does not magically add verified lessons, official syllabus coverage, assessment banks, or subject-specific tools for every catalogue entry. Curriculum and content readiness must remain independently verified.
