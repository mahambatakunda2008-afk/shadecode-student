# Shadecode Student: cross-platform subject personalization and mobile release register

**Last updated:** 2026-10-27  
**Purpose:** A durable register of the work discussed for broad subject support, per-learner personalization, native Android alignment, and a safe Android release. This file records what exists separately from what is planned or verified.

## Product requirement

Shadecode Student is a personal academic operating system, not a Mathematics-and-Physics-only app. A learner should be able to choose the subjects and skills relevant to their own stage, qualification, curriculum and goals. The interface should emphasize the learner's choices while allowing them to add, remove and change subjects later without restarting onboarding.

## Scope agreed

### Learner and curriculum dimensions
- Education stage: early childhood, primary, lower secondary, upper secondary/O Level, AS/A Level, university/polytechnic, TVET/professional, and independent/self-directed learning.
- Subject choice: multiple subjects, including school subjects, languages, humanities, business, sciences, technology, creative subjects and practical skills.
- Curriculum identity: board/provider, qualification, level, subject/syllabus code, syllabus version/session and optional paper/component.
- Personal learning profile: current ability/mastery, prior attempts, repeated mistakes, weak concepts, revision needs, preferred explanation style, daily goal and learning goals.
- Access rules: subjects shown and recommended should follow the learner's actual profile; geography-specific and other specialized modules should not be forced on unrelated learners.
- Multi-client consistency: web and native Android must use compatible subject identities and profile semantics.

### Initial subject families (not an exhaustive claim of verified syllabus coverage)
- Mathematics and numeracy: Mathematics, Additional Mathematics, Further Mathematics, Statistics and technical mathematics.
- Sciences: Integrated Science, Biology, Chemistry, Physics, Agriculture, Environmental Science and related applied sciences.
- Languages and literature: English, Shona, Ndebele, Literature and other languages.
- Humanities/social sciences: History, Geography, Religious Studies, Sociology, Psychology and related fields.
- Business: Business Studies, Accounting, Economics, Commerce and finance-related study.
- Computing and technology: Computer Science, ICT, programming, Design and Technology.
- Creative and practical areas: Art and Design, Music and other vocational/practical disciplines.

A catalogue entry only means a subject can be selected. It does not prove that a complete, syllabus-verified content library or every learning module is already available. The UI and product must clearly distinguish selectable, curriculum-mapped, content-ready and fully tested states.

## Known current implementation findings

- The web onboarding subject picker is already stage-aware, but its hard-coded lists are incomplete.
- The web Subjects page displays the current user's subjects returned by `/api/learn`; it does not yet provide a complete searchable catalogue or robust add/remove/manage workflow.
- The settings page supports basic identity and preferences, but it is not yet a complete academic-profile editor.
- The onboarding mapper carries study level, subject interests and optional curriculum details. Exact curriculum subject rows are only produced when required board/qualification/level/version and subject-code data are available; unknown syllabus codes should not be guessed.
- A subject-management API route was started on 2026-10-27 at `src/app/api/subjects/route.ts`. It needs review against the actual schema and full integration with the Subjects UI before being considered complete. Do not claim the user-facing add-subject journey is done until tested.
- Android Snap & Extract work is native-only. It does not automatically appear in the web app. Cross-platform features must be implemented in the relevant client(s).
- Native Snap & Extract currently supports local image import, bundled on-device Latin OCR, editable/raw OCR, text cleanup, phrase redaction in the text representation, copy/share, and a private app-local saved-text library with local search. It does not yet perform source-image pixel redaction, full diagram understanding, structured table/equation extraction, or source-image archival.
- An APK from an older workflow is not proof of the latest source. Only use an artifact when its workflow run's `head_sha` matches the source commit being released.

## Work register

### P0: safe mobile release
- [ ] Identify the exact current main commit and Android workflow run.
- [ ] Build Android from that exact commit using the repository's CI workflow.
- [ ] Inspect and fix build/test failures, without claiming device tests that were not run.
- [ ] Verify APK artifact commit SHA, artifact name, size and availability.
- [ ] Verify production signing secrets exist before attempting a production release. An unsigned debug APK is for preview/testing, not a production release.
- [ ] If signing is configured, produce and verify signed release APK and Play Store AAB.
- [ ] If signing or Play Console access is absent, publish only a clearly labelled preview APK and record the remaining release blockers.
- [ ] Install and smoke-test on a real Android device, including startup, login/profile, navigation, offline extraction, saved-extract search and data persistence.
- [ ] Verify target/minimum Android versions and device architecture compatibility.
- [ ] Create release notes and a GitHub release only when the artifact is tied to the verified commit.
- [ ] Never claim Play Store publication unless it has actually happened.

### P1: subject management on the web
- [ ] Review the new `/api/subjects` route against the actual profile and subjects table schema, RLS policies and duplicate/race behavior.
- [ ] Integrate a searchable, level-aware subject catalogue into `/subjects`.
- [ ] Add a real add-subject action with loading, validation, error and success states.
- [ ] Add safe removal/deactivation semantics; do not destroy learning history when a subject is removed from the active list.
- [ ] Ensure changes persist in the canonical learner profile and are reflected by `/api/learn`, dashboard, Learn, Exam Sim, timetable and other relevant modules.
- [ ] Add profile controls to update stage, board, qualification, syllabus and goals, preserving the existing account and history.
- [ ] Confirm RLS and authorization prevent changing another learner's subjects.
- [ ] Add tests for new subject, duplicate subject, invalid input, save failure, removal, and session reload.

### P2: shared subject and curriculum catalogue
- [ ] Replace scattered hard-coded subject arrays with a shared, versioned subject catalogue and stable IDs.
- [ ] Model aliases and regional names (e.g. Maths/Mathematics) without creating duplicate subjects.
- [ ] Catalogue subject families and supported stages; allow custom/other subjects with explicit review state.
- [ ] Separate subject selection from verified board/qualification/syllabus mappings.
- [ ] Add curriculum coverage states: selectable, mapped, content-ready, reviewed, tested.
- [ ] Support syllabus versions and effective dates; never infer a syllabus code solely from a subject label.
- [ ] Audit coverage across Cambridge, ZIMSEC and other declared boards before marketing complete support.
- [ ] Verify diagrams, graphs, practical work, paper components and other subject-specific exam formats, not just text lesson presence.

### P3: personalization and learning adaptation
- [ ] Make content generation and retrieval consume the learner's selected subject, stage, board, qualification and syllabus where verified.
- [ ] Calibrate difficulty from demonstrated understanding, not age or grade alone.
- [ ] Track mastery, spaced revision, concept decay, repeated errors and learning progress with transparent explanations.
- [ ] Keep subject-specific content and tools conditional on the learner's selected subjects and actual module support.
- [ ] Avoid claiming generated material is syllabus-accurate unless the relevant source and version were verified.
- [ ] Preserve privacy: no sale of student data; private learning artifacts must not enter a shared cache.

### P4: Android/web parity
- [ ] Use the same stable subject IDs, learner stages and curriculum semantics in web and native Android.
- [ ] Add or improve native subject management/profile editing after the web data contract is stable.
- [ ] Make cached learner profile and selected subjects resilient to temporary network failures.
- [ ] Test that profile edits sync without erasing cached subjects when the remote response is empty or fails.
- [ ] Document which capabilities are local, cloud-dependent, available on web, and available on Android.

## Acceptance criteria for subject personalization

The work is not complete until a new and existing learner can:
1. Select several appropriate subjects for their education stage.
2. Search and add a subject that was not in the initial shortlist, or explicitly request an unlisted subject.
3. Set board/qualification/syllabus when known, without fabricated defaults.
4. Remove a subject from the active learning space without losing its historical work.
5. See the right subjects in the web app after refresh and sign-in again.
6. Get content appropriate to the selected stage and curriculum, with unsupported coverage disclosed honestly.
7. Have the same core profile reflected in Android.
8. Use the core subject list even when AI generation is unavailable.

## Release status rule

Until CI artifacts, signing and device testing are inspected, release status is **not verified**. A successful code commit alone is not a release. A CI-built debug APK is a preview artifact; production distribution requires signing and appropriate release-channel checks.
