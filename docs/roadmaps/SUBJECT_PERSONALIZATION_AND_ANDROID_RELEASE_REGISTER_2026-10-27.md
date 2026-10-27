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
- The web Subjects page now includes a searchable catalogue, add-subject action (including custom names), removal that preserves historical work, and a curriculum profile editor. This is implemented in source, but authenticated browser scenarios and automated CI must pass before calling the complete user journey verified.
- The settings page supports basic identity and preferences, but it is not yet a complete academic-profile editor.
- The onboarding mapper carries study level, subject interests and optional curriculum details. Exact curriculum subject rows are only produced when required board/qualification/level/version and subject-code data are available; unknown syllabus codes should not be guessed.
- Subject management is integrated through `src/app/api/subjects/route.ts` and `src/app/(app)/subjects/page.tsx`. The API scopes writes to the authenticated learner and removes a subject from the active profile without deleting the subject row. Review duplicate/race behavior and test profile persistence, RLS, add/remove and refresh before considering the workflow verified.
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


## Additional requirement: full web-to-mobile capability parity

The user explicitly requires the mobile release to include the capabilities of the web version, not only a minimal native shell. The authoritative cross-platform acceptance contract is now documented in [MOBILE_WEB_FEATURE_PARITY_MATRIX_2026-10-27.md](./MOBILE_WEB_FEATURE_PARITY_MATRIX_2026-10-27.md).

This requirement means **feature parity with native mobile interactions**, not copying desktop layouts or embedding the website in a WebView. Preserve the Kotlin/Jetpack Compose Android client and reuse the existing authenticated API/data contracts. The parity scope includes, at minimum, Cortex/insights, Learn, Exam Hub and Exam Simulation, Math Checker and subject tools, tasks/timetable/focus, analytics/history, XP/achievements/challenges/leaderboards, Code Lab, Project Studio, careers, settings/trust, and durable offline storage/sync where each feature's real implementation permits it.

### Required execution order

1. Inspect current Android source, web routes/components, API contracts, Android CI/release workflow, current main SHA, and release artifacts before changing feature code.
2. Make subject/profile contracts canonical and shared: all relevant subjects and education stages, multiple selected subjects, board/qualification/syllabus only when known, and explicit content-readiness status. The native UI must not hard-code Mathematics and Physics as the only subjects.
3. Implement and verify native profile/subject management, then parity-critical learning workflows in vertical slices.
4. Treat offline as a per-capability contract. Saved data, local computation, queued mutations and network-only AI must be clearly distinguished; account-scoped data and idempotent sync are mandatory.
5. Test web and Android against the same scenarios and data semantics. Keep a capability **Partial** until both clients' behavior and acceptance evidence are verified.
6. Build the Android artifact from the exact intended commit; verify workflow `head_sha`, signing, install/upgrade and real-device smoke tests before publishing.

### Status correction

- [x] Record the explicit full-feature parity requirement and acceptance matrix.
- [ ] Audit current native implementation against the matrix; no parity claim until source-level evidence is collected.
- [ ] Implement missing native capabilities in prioritized vertical slices.
- [ ] Verify shared subject/profile changes across web and Android.
- [ ] Pass CI and real-device release gates; publish a commit-matched artifact only after verification.

This documentation commit is not a mobile feature implementation, a successful Android build, or a release. Those remain open work items.


## Native Android implementation slice added on 2026-10-27

The feature-parity branch now contains an initial native profile/subject-management slice. This is implementation in source, **not yet verified by a successful Android build or device test**.

- [x] Added `NativeSubjectCatalog.kt`, a searchable starter catalogue spanning quantitative subjects, sciences, languages, humanities, business, computing, creative/practical and higher-education areas. The catalogue is explicitly not a claim of complete syllabus/content coverage.
- [x] Added a native profile editor in the existing Profile tab: editable display name and study-level field, searchable subject checkboxes, add custom subject, remove selected subjects, and save/error/loading feedback.
- [x] Added authenticated `PATCH /rest/v1/profiles?id=eq.<current user>` for learner-editable fields only. The existing profile-to-subject-catalog database trigger remains the catalog synchronization mechanism.
- [x] Improved Android subject name/code matching so profile codes such as `maths` and `computer-science` can match the canonical display names used in the subjects catalog.
- [x] Kept profile cache updates after a successful remote save and refreshes the local subject list after the save.
- [x] Added Android workflow pull-request triggers for changes to Android sources/workflow, so future PRs can compile the native app before merge.
- [ ] Confirm the new Android workflow runs for this PR and inspect the actual Gradle/Kotlin build result.
- [ ] Fix any compile/test failures revealed by CI.
- [ ] Verify save/add/remove/refresh/relogin behavior against the live Supabase schema and RLS with a test account.
- [ ] Expand profile semantics to board, qualification, syllabus/version, goals, and per-subject curriculum identity only after matching the canonical web profile contract.
- [ ] Implement and verify remaining web feature parity slices: Cortex insights, Exam Hub/Simulation, Math Checker/subject-specific tools, tasks/timetable/focus, analytics/engagement, Code Lab, Project Studio, careers, privacy controls, and robust offline synchronization.

The current Android profile editor allows editing the existing study-level field, but it is not yet a complete academic profile editor. The current native app still does not have full web feature parity, and this branch must not be released as if it does.


### Follow-up slice: focus timer and cache correctness

- [x] Added a local 15/25/45-minute focus timer to the native Practice workspace with start, pause, reset, and completion feedback.
- [x] Corrected initial sync so an intentionally empty subject profile clears stale local subject rows, while a temporarily empty remote catalog does not erase cached subjects for a profile that still selects subjects.
- [ ] Verify these changes with Android CI and manual device testing.
- [ ] Focus session history, interruption-safe persistence, notifications/background timing, and sync with the web Focus module remain unimplemented.

### Follow-up slice: offline task and timetable synchronization (2026-10-27)

- [x] Cache task and timetable snapshots in account-scoped Android DataStore keys.
- [x] Queue task creation and task completion when a retryable network failure prevents a server write.
- [x] Reconcile a locally created task ID to its server ID after queued creation succeeds, including updating queued completion operations.
- [x] Queue timetable replacement after retryable network failures; keep the locally saved timetable visible and tell the learner that sync is queued.
- [x] Re-read the pending-operation queue after each operation so ID reconciliation is applied before the next queued operation is executed.
- [x] Append a follow-up WorkManager job rather than replacing an active sync job.
- [ ] Confirm the latest Android and web CI runs pass after these synchronization changes.
- [ ] Test offline task creation, task completion, timetable save, account switching, token refresh, reconnect and duplicate/retry behavior on a real or representative Android device.
- [ ] Add explicit idempotency/conflict handling. A connection loss after a server write but before its response may still cause a retry to duplicate a task.
- [ ] Extend queued offline behavior to other mutation-capable modules only after each API and conflict contract has been reviewed.

The queue currently covers task creation, task completion and timetable replacement only. This is not a claim that the entire app works offline, and a successful CI build alone would not prove reliable background sync on a device.

## Android release continuation update: 2026-10-27

### Exam Simulation recovery change
- Implemented `NativeExamAttemptStore.kt` for private, device-local, per-account recovery of an unfinished native exam.
- `NativeExamSimulation.kt` now restores the saved paper/questions, answer map, selected subject, remaining time and taking state when the screen is recreated or reopened.
- The screen writes recovery checkpoints as the paper, answers and timer state change. A recovered attempt that has reached zero seconds remains submittable for marking.
- The stored attempt is not uploaded by this recovery mechanism. It uses Android private app preferences keyed by the authenticated Supabase user ID.
- **Not yet verified:** fresh Android compilation, force-stop/process-death recovery on a real device, persistence across an app update, and recovery behaviour after logout/re-login. Treat this as implemented code awaiting verification, not a release-certified feature.

### Current CI evidence
- Android workflow run 256 ([run details](https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40588772124)) was cancelled before project validation/build after further branch updates; it produced no artifact for the latest code.
- Web CI run 4315 ([run details](https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40588772129)) completed successfully, but it does not compile the Kotlin Android client.
- The current branch head is newer than the cancelled Android run. A successful Android build for the latest head is still required.
- The older debug APK must not be represented as containing this recovery change. Use only an artifact whose workflow run head SHA matches the final tested commit.
- Offline bundled-paper manifest remains intentionally empty (`android/app/src/main/assets/offline-papers/index.json` is `[]`) pending documented redistribution rights. Online downloads saved by Exam Hub remain a separate path.

### Verification update: Android debug build completed (2026-10-27)
- [x] Android workflow run 260 completed successfully for branch head `a5fc1aac7a0a774b8cc21ac06a5e5ee73266d293`.
- [x] Gradle project validation and `:app:assembleDebug` passed; the workflow uploaded artifact `shadecode-student-android-debug-260`.
- [x] The artifact metadata confirms it was built from the same head SHA above. Its ZIP contains `ShadecodeStudent-debug.apk`.
- [x] The first-run setup screen is wired into `StudentShell` when the saved learner profile has not completed onboarding. It captures display name, study level and subject selection, saves the profile through the authenticated API, and refreshes the subject cache.
- [ ] This is a **debug APK**, not a signed production build. Release-signing preparation was skipped because no Android signing secret was available to this workflow.
- [ ] Install and test on a physical Android device, including fresh account onboarding, account switching, offline paper access, and exam recovery after force-stop. CI success proves compilation and artifact upload, not real-device behaviour or complete feature parity.
- [ ] Continue the next implementation slice: test the downloaded past-paper attempt workflow on a real device, especially process death, expired deadlines, pause/resume, offline PDF opening and account switching. Source inspection confirms the past-paper workspace already persists a deadline and recomputes remaining time when an attempt is reopened; this still needs device verification.

### Past-paper retry usability fix (2026-10-27)
- [x] Added an explicit **Start a fresh attempt** action after a timed past-paper attempt has finished or expired.
- [x] Added a confirmation step that warns the learner that the saved answer notes and timer for that paper/account will be cleared; the downloaded PDF itself is preserved.
- [ ] Verify the Kotlin/Android build for commit `429960cd09745d3762cc63cf91dd1b1d0fcf8bd8`.
- [ ] Verify completed/expired attempts can be restarted, the timer starts only when requested, notes persist while an attempt is active, and cancel leaves existing work untouched.



### App distribution and in-app discovery (2026-10-27)
- [x] Added a visible **Get the app** path to the public landing page, including a mobile-visible hero CTA.
- [x] Added `/download` with browser-supported PWA installation, manual home-screen instructions, release-announcement link, and clear offline limitations.
- [x] Added a dismissible, inline installation notice to the authenticated web app so existing users can find the installation options without a floating overlay.
- [x] Avoided publishing a stale Actions artifact as a public download. Workflow artifacts expire and are not a stable public release channel.
- [ ] Publish the dedicated Android download only after a commit-matched APK is built, installation/security checks pass, and a production signing key is configured. The page deliberately does not advertise an unsigned debug APK as a production release.
- [ ] Validate browser installability (manifest, service worker, icons and HTTPS) across Chrome Android and desktop browsers; confirm the fallback instructions are clear on iOS Safari.
- [ ] Once a signed release exists, change the Android card on `/download` into a direct versioned download with checksum, version/release notes, minimum Android version and update guidance. Keep the PWA install path available as the low-friction option.

- [x] Kept the dedicated install-prompt event handler in the shared PWA installer instead of adding another competing `beforeinstallprompt` listener to the download page.
- [x] Removed the duplicate install-prompt listener from service-worker registration; it now handles service-worker lifecycle and sign-out cache clearing only.
- [x] Reduced past-paper countdown polling from four times per second to once per second. Remaining time still derives from the saved wall-clock deadline, and this change awaits Android CI/device verification.


### Release status update (2026-10-28)

- [x] PR #489 merged into `main` as merge commit `107cf10a691ad5739a0e14f3f515a7091baca13a`.
- [x] Vercel production deployment for that exact merge commit reached `READY`; the deployment aliases include `shadecodestudent.vercel.app`. Deployment ID: `dpl_7BbBUw3vkuzHvKVp5AjzjBzcFb1b`.
- [x] The landing-page source on `main` contains a header **Get the app** link and a mobile-visible hero link to `/download`.
- [x] The existing `/download` route is the only route for that path and clearly labels Android and Google Play as not yet released.
- [x] Android debug workflow run 275 succeeded and uploaded `shadecode-student-android-debug-275` (artifact ID `12775770379`, SHA-256 `506cae8fdca59afd9c3b3b7be47ca9f18812ebde7786dbb92a13a5dad6639b91`). Its source is PR head `6f92897ffd24a82ee8c6ac2244e1d3cb36e4c9f5`, the exact code tree merged by PR #489; it is a **debug-only** artifact, not a production-signed release.
- [ ] Confirm the deployed `/download` route in a real browser on desktop and mobile, including the install instructions and links.
- [ ] Add production Android signing secrets through GitHub repository settings (never commit a keystore or passwords). Required secret names in the workflow: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. The keystore must be retained securely and reused for future updates; losing it can prevent users from updating an installed APK.
- [ ] Trigger a fresh Android workflow on `main` after signing is configured, then verify signed APK and AAB artifacts, package/version metadata, checksum, install/upgrade behaviour, and Play Console requirements.
- [ ] Complete real-device checks for onboarding, account isolation, downloaded-paper offline access, timer/process-death recovery, and web-to-native account continuity before publishing a public Android APK.
- [ ] Do not bundle complete Cambridge or ZIMSEC papers until redistribution rights and attribution requirements are confirmed. Keep the bundled-paper manifest empty meanwhile.

## Execution update: 2026-10-28

- Merged PR #492, commit `282baa70aa40121fedca471c1a45e2f85c5f2985`: signed Android APK and AAB releases now generate a SHA-256 manifest, upload it as a CI artifact, and attach it to tagged GitHub releases. This workflow addition has not yet been validated by a signed release because signing credentials are intentionally deferred.
- Merged PR #493, commit `ec940bcbbea3f49335a68c807b617501d952500b`: fixed over-escaped regular expressions in the web Subjects page's search/duplicate normalizer. Source inspection confirms the intended Unicode letter/number and whitespace patterns. Authenticated end-to-end scenarios and automated CI still need verification.
- The current GitHub commit-status integration reports a Vercel status failure pointing to a Vercel build-rate-limit/upgrade page. Treat this as a deployment-capacity blocker, not evidence that application tests failed. Do not claim the newest web commit has deployed until a production deployment with the exact source SHA is observed.
- Android production signing remains intentionally pending. Do not publish the existing debug artifact as the production app. After credentials are configured, build from the then-current `main` SHA, verify the signed APK/AAB and checksum manifest, and perform real-device smoke tests before public distribution.



## Documentation reconciliation (2026-10-28)

- Updated `android/README.md` to distinguish the opt-in first-visit offline starter pack from papers bundled in the APK, and to document checksum generation as part of the signed-release workflow.
- PR #492 and PR #493 are merged. Current `main` has release checksum automation and the subject search normalization fix. Latest web production deployment still points to `107cf10a691ad5739a0e14f3f515a7091baca13a`; Vercel has reported a build-rate-limit status for newer commits, so do not assume the newest code is live.
- Latest documentation commit at the time of this entry: `9f8f261594513ac99f3d729c6fcc08e52bb92f48` (Android README clarification). Subsequent documentation changes may advance `main`.

## Progress update: 2026-10-28

- Fixed the Subjects page so a successful add/remove is not incorrectly presented as a failed mutation when only the follow-up list refresh fails. Removal falls back to updating the visible local list while preserving historical subject rows.
- Confirmed the previous subject-mutation fix's CI run passed typecheck, lint, tests and production build; its Vercel production deployment reached READY and was assigned the `shadecodestudent.vercel.app` alias.
- Fixed subject-key normalization to preserve letters and numbers from non-ASCII writing systems instead of stripping everything outside ASCII. Added regression coverage for accented Latin and Chinese subject names.
- Latest Unicode regression-test commit is queued for CI and a new Vercel deployment. Do not call the Unicode fix production-live until that exact commit reaches READY.
- Remaining verification: authenticated browser tests for add/remove, duplicate submissions and profile persistence; database trigger/RLS and cross-device race behavior; real Android device smoke tests; signed APK/AAB and release verification after signing credentials are configured.
