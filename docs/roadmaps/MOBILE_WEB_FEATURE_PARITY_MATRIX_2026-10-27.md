# Shadecode Student: Web-to-Mobile Feature Parity Matrix

**Last reviewed:** 2026-10-27  
**Status:** Execution contract; this document does not claim parity has been implemented.  
**Native target:** Kotlin + Jetpack Compose Android app, package `com.shadecode.student`.  
**Web reference:** the existing Next.js application and its production APIs.  
**Principle:** mobile must deliver the meaningful capabilities of the web product, not merely login, Home, Learn, Practice and Profile screens. Native UX may differ where touch, small screens, local storage or device capabilities make that better. The underlying learner, curriculum, progress and authorization semantics must remain consistent.

## Current implementation evidence (2026-10-27)

- Android CI passed for commit `458d6e82cdac7254ee2c59ff200e8ec33abbfa56`; the workflow uploaded debug APK artifact `shadecode-student-android-debug-180`. This proves that commit built, not that the app has been tested on a physical phone or is a production release.
- The verified build includes the native learner subject/profile editor, task workspace and focus-session completion sync.
- Native timetable reader added in commit `ace4b81da4d5aad3d4933c7aaa5415298e4d1266`; the broader build on commit `0fb5af0a7d583b095574b6169d342bbeea3be2ad` passed CI. This verifies the timetable reader compiles in that source snapshot, but not its behavior on a physical device.
- Native Cortex Insights card added to the dashboard in commits `fb1f8b97d243ff072f6dd9fc6b983eec357e38d6` and `a917e99f12e3f03c02e92c0172305ea74572bd5c`. It reads the signed-in learner's own `cortex_insights` rows through Supabase RLS, shows loading/empty/error states, and supports refresh. The build for this addition is queued/pending at the time of this update; do not call it build-verified until CI succeeds.
- Latest Android CI for the Cortex Insights card: https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40493545430
- Native timetable generation and saving are now implemented in `MainActivity.kt` and `NativeApi.kt`: learners can select their configured subjects, choose a start time/session length/break length, generate a schedule locally, and save it through the existing `replace_own_timetable` authenticated RPC. This preserves the server-side atomic replacement and RLS ownership contract. The CI build for this latest change is pending; physical-device behavior is not yet verified.
- Offline resilience has advanced in the latest branch commits: tasks can be created/completed into an account-scoped durable queue, timetable replacements are queued after retryable network failures, and the worker re-reads the queue after each operation so a queued completion can use the server ID assigned to a newly synced task. Work is appended rather than replacing an active sync worker. This is source implementation, not yet proof of successful sync on a device; the latest changes still require Android CI and runtime validation.
- Remaining timetable gaps include editing individual generated slots and choosing dates/recurrence. Device testing, signed production APK/AAB, and broad feature parity remain open.
- Successful debug APK artifact from the earlier profile/tasks/focus build is available until its stated expiry through the GitHub Actions run page: https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40490647026


### Native first-launch setup screen (implementation added; build/device verification pending)

- After sign-in, accounts that have not completed onboarding are routed to a dedicated native setup experience instead of the normal app shell.
- Setup collects display name, study stage (Primary through university/TVET/independent study), and a searchable catalogue of subjects across maths, sciences, languages, humanities, business, computing, creative/practical and professional areas.
- Requires a study stage and at least one subject. Saves through the authenticated profile update and then refreshes the local subject cache. Existing accounts that already completed onboarding continue to the normal shell.
- This is the app's first-launch setup screen, not a replacement for Android's system package-installer UI. The Android OS controls its own install confirmation screen.
- Source: `android/app/src/main/java/com/shadecode/student/MainActivity.kt`. CI/build and device testing must confirm the setup-to-shell transition and account persistence.

### First-visit offline starter pack (source implementation; CI/device verification pending)

- On the first visit to Exam Hub for each signed-in account, the native app offers a full-screen offline study setup screen showing the user's selected subjects and a clear opt-in to download an offline starter pack. It does not silently consume data during installation or on mobile data.
- The action proceeds only when Android reports Wi-Fi or Ethernet. It attempts the newest available question paper plus its matching mark scheme for selected syllabus entries, with a 12-PDF cap for the initial pack. Existing downloads are skipped; files are stored in the private account-scoped offline library.
- The user can skip setup and download individual papers later. The setup screen is remembered per account. The prompt is remembered per account.
- Android installation itself does not run network downloads. This is a first-use, post-install action after sign-in and opening Exam Hub.
- This uses the existing authenticated exam catalogue and signed paper-download route. It does not bypass redistribution rights, and it only downloads papers already present in the authorized catalogue.
- The implementation is in `NativeExamHub.kt` and requires `ACCESS_NETWORK_STATE` to avoid starting the pack over mobile data. Build and physical-device validation are still required before calling this verified.
- The starter-pack selector now attempts matching inserts and data/formula booklets, when present for the same paper number and variant, alongside the question paper and mark scheme. It no longer assumes the alphabetically first session contains the newest year's paper: it searches available levels, years descending and session recency, and only chooses a bundle after confirming a question paper exists for that exact combination. This is committed source code; CI and runtime verification for the latest selector change are pending.
- Offline paper downloads now require HTTPS and reject redirects, accumulate the PDF magic header across short network reads (rather than assuming the first read contains five bytes), enforce the existing 50 MB limit, and only commit a file after the PDF header has been checked. The Android workflow must pass for the commit before this hardening is considered build-verified; physical-device and redirect behavior still require runtime testing.


- The native offline-paper library now reports both the saved PDF count and their combined on-device size, so learners can see the local storage footprint before saving more material. Source change: `d0321c124d10ddfc761ddfaafd3189eda2575b0b`. Build and device validation are still required; this is not a storage quota or a guarantee of available device space.

- The Exam Hub now shows a helpful empty state when no PDFs have been saved offline yet, explaining how to save papers and pointing learners to the subject catalogue below. This avoids hiding the offline-library section entirely for first-time users. Source change: `100a7222fd22275451f1c95dcb4a0b05e8c919c7`. CI and Android build/device verification are pending.

- The offline-paper list now sorts by local save time, with the most recently saved PDFs first. Search and type filters remain local and continue to work offline. Source change: `7316ffc0764734c01a01ebb15f1699532d5f415b`; build and device verification are pending.

## 1. Parity rules

1. **Feature parity, not pixel parity.** Adapt the interaction for a phone while preserving the capability, inputs, outputs, saved state and recovery paths.
2. **One learning system.** Reuse existing authenticated APIs, Supabase data contracts, canonical learning events and Cortex routing. Do not create a separate Android-only source of truth for learner progress or subject identity.
3. **Native means native.** The Android client remains Kotlin/Compose, not a WebView wrapper around the website.
4. **All supported subjects, not two hard-coded subjects.** Use a shared, searchable catalogue and learner-specific selections. Do not claim full syllabus content merely because a catalogue item can be selected.
5. **Offline claims must be exact.** Each capability must say whether it works offline, works with previously synced content, queues changes, or requires network/AI. No fake successful saves or fake offline AI.
6. **Private by default.** Cache and sync data by authenticated learner; isolate account switches; never put private learner content in cross-user shared caches.
7. **Progressive exposure is allowed.** A feature may be hidden when irrelevant to a learner's selected stage/subjects, but must not be omitted from the mobile product merely because it is absent from the initial navigation.
8. **Evidence before status.** A screen or API is not parity. Each row must be exercised on a real or representative Android environment and linked to test/build evidence before being marked verified.

## 2. Feature parity matrix

The Android README states that the native app currently has a smaller surface than the web app. Therefore, all entries below are targets until native implementation and verification evidence are recorded.

| Capability area | Required mobile capability | Cross-platform/data contract | Offline expectation | Release acceptance |
|---|---|---|---|---|
| Identity and onboarding | Sign up/sign in, session recovery, onboarding, stage and goal selection | Supabase Auth and canonical learner profile | Existing session/profile readable from safe local cache; first sign-in needs network | New and returning users can authenticate; expired sessions recover without losing local work |
| Academic profile and subjects | Search/add/remove subjects, multiple stages/boards/qualifications, syllabus/version when verified, edit goals and preferences | Stable shared subject IDs and the same profile semantics as web | Previously synced selections remain visible; edits queue only where safe and visibly pending | Web edit appears on Android and vice versa after sync; removing a subject preserves historical work |
| Home and next actions | Personalized dashboard, tasks, timetable, streaks, XP/level, achievements, daily challenge and recommendations where supported | Existing learner state, canonical events and server-authoritative scoring | Cached dashboard state can be read; queued actions are clearly marked | No fabricated XP, streaks or mastery; refreshed state reconciles correctly |
| Cortex / learning intelligence | Learner insights, weak areas, recommendations and relevant learning history | Existing Cortex APIs, event contracts and mastery semantics | Show previously synced insights with a timestamp; explain when fresh analysis needs network | No invented insights; authenticated and learner-scoped results |
| Learn / lessons | Browse/search lessons, generate or retrieve lessons, structured explanations, examples, practice, answers/feedback, resume and save | Existing lesson/Cortex routes and curriculum metadata | Saved lessons and progress remain usable; generation may require cloud unless a genuine local capability exists | Generate/retrieve → save → close/reopen → practice → recover works; failures do not trap progress |
| Exam Hub / past papers | Browse supported papers/questions, filters, source/provenance, topic mapping and mark schemes where available | Existing question/paper sources and syllabus identifiers | Downloaded/saved material is available offline; new remote resources require network | Subject/board filters are correct; unknown provenance/coverage is disclosed |
| Exam Simulation | Timed exam, question navigation, typed working, answer input, diagram/canvas tools where relevant, submission, marking, results and resume/recovery | Existing exam APIs and server-authoritative marking/score persistence | Downloaded or locally available exams can be attempted offline only where supported; sync result safely later | Timer and answers survive interruption; no duplicate submission or false cloud-save success |
| Math Checker / working tools | Enter or capture a problem, show steps/checking, math rendering, calculator and typed working | Existing Math Checker/Cortex routes and deterministic math tools | Deterministic/local tools where available; cloud explanation clearly requires network | Accurate input/error handling; no silent loss of work |
| Subject-specific practicals | Appropriate diagrams, graphs, sketches, tables, practical/experimental workflows and subject tools | Curriculum and assessment format must drive available tools | Saved resources and locally implemented tools remain available offline | Do not force geography/science/computing tools on unrelated subjects; do not replace required visual exam work with text-only output |
| Computer Science / Code Lab | Pseudocode, algorithms, Python, console programming, web development, databases/SQL, projects and practical-exam pathways where supported | Board-agnostic capability model with board-specific pathways; shared saved work | Local editor/project work remains accessible; remote execution/collaboration is labelled | Code and projects persist; unsupported execution is not presented as working |
| Math/handwriting and capture | Snap & Extract/OCR and math capture where supported; editable extraction and correction | Native device APIs may differ, but saved learning artifacts and privacy rules remain compatible | Local OCR/extracts and local library are offline; network-only interpretation is labelled | OCR limitations disclosed; account data never leaks between users |
| Focus and study organization | Focus sessions, tasks, timetable, reminders where implemented, revision planning | Same learner-owned tasks and schedules | Read cached schedule and record supported local actions; explicit sync state | Time-zone/date behavior, interruption recovery and sync are checked |
| Analytics and history | Progress, performance, topic mastery, trends and past results | Canonical learning events and existing authoritative stores | Display cached history with freshness indicator | No mismatched totals or fabricated mastery; account-scoped |
| Engagement | XP, levels, streaks, achievements, leaderboards, challenges and sharing where implemented | Server-authoritative rules; user-initiated share actions | Local progress can queue only under defined idempotent rules; leaderboards need network | No client-side score manipulation, duplicate awards or automatic messaging |
| Project Studio and creation | Project plans, milestones, evidence, drafts, document assembly and recovery where supported | Existing project/data contracts and provenance/integrity rules | Drafts and saved evidence are durable locally only when storage supports it; sync conflicts visible | Reopen and recover drafts; never fabricate evidence or overwrite newer versions silently |
| Careers and broader learning | Careers explorer and education pathways relevant to learner stage | Shared profile and supported data sources | Previously saved content may be readable offline | Recommendations disclose limits and do not appear as guaranteed outcomes |
| Settings, privacy and trust | Profile/preferences, privacy/terms, data export/deletion entry points when implemented, support/feedback | Same account controls, server-side authorization and privacy promises | Settings may be cached read-only; destructive/account actions require secure confirmation and often network | No false claim that export/deletion completed; authorization tested |
| Offline storage and sync | Local database, saved content, progress, pending mutations, retries, conflict and account-switch handling | One coordinated sync contract; idempotency and versioning; no parallel uncoordinated queues | Must survive airplane mode, app restart, reconnect and account switch for explicitly supported workflows | Test airplane mode, reload/reopen, storage pressure, retries, conflict, logout/login and reconnect |
| Accessibility and mobile UX | Touch targets, keyboard/input behavior, screen readers, text scaling, contrast, small-screen layouts, safe areas and no unwanted floating UI | Same design tokens and product identity where practical | Core cached workflows remain navigable offline | Test small and large phones, landscape where relevant, keyboard open, font scaling and navigation |
| Release and updates | Versioned APK, reproducible build, release notes, checksums where practical, update instructions and canonical download page; AAB for Play when signed/configured | Artifacts tied to exact source commit and existing GitHub release workflow | App launches without update service; stale-version messaging is honest | Match workflow `head_sha` to source commit; verify signing, installation, update path and device smoke test |

## 3. Subject-aware mobile navigation

The app must not show a fixed Mathematics/Physics-only list. The primary learning surface should be assembled from the learner's stage, selected subjects and actual feature/content readiness:

- **My subjects:** selected subjects, search/add/manage, visible coverage state.
- **Continue learning:** resume recent lessons, practice, papers and projects.
- **Study plan:** next actions, timetable and tasks.
- **Tools:** contextual tools only when relevant to the learner's selected subject or activity.
- **Cortex:** insights and recommendations, with evidence/freshness context.
- **Profile:** stage, board, qualification, syllabus/version when verified, goals and preferences.

This is a conceptual information architecture, not a mandate to replace the existing native UI wholesale. Preserve working navigation and improve it incrementally.

## 4. Shared capability registry

Maintain separate fields for:

- web implementation status and evidence;
- Android implementation status and evidence;
- offline behavior;
- relevant education stages, subjects and curriculum coverage;
- API/data contract;
- automated tests and manual device test evidence;
- release/version first verified.

Allowed statuses: **Verified**, **Partial**, **Planned**, **Blocked**, **Not applicable**. A web-only feature must remain visibly **Partial** for cross-platform parity. Do not mark a whole area Verified because its landing screen exists.

## 5. Release gates

### Gate A: source and CI
- Confirm the exact source commit and inspect current Android workflow.
- Run the web quality gates relevant to changed shared contracts: lint, typecheck, tests and production build.
- Run Android unit/compile/build checks and inspect failures.
- Build artifacts from the exact commit being considered for release.

### Gate B: parity-critical workflows
- Auth/session/profile and multi-subject onboarding.
- Add/remove subject, reload and cross-client profile synchronization.
- Learn: generate/retrieve, save, reopen, practice and failure recovery.
- Exam Simulation: input, typed working/canvas where supported, interruption and result persistence.
- Offline: cached content, local progress, app restart, reconnect, retry and account switching.
- Privacy/RLS and learner data isolation.
- Main navigation, accessibility, screen sizes and app identity.

### Gate C: distribution
- Verify artifact workflow `head_sha` equals the intended source commit.
- Confirm signed release credentials before calling an APK production-ready.
- Debug/unsigned APKs must be labelled preview/testing only.
- Test installation and upgrade on a real Android device; record device/OS and outcome.
- Publish GitHub Release/download page only for a verified artifact.
- Report Play Store submission separately; never imply it happened automatically.

## 6. Work sequence

1. Reconcile the native source tree, active Android workflow, latest main commit, CI, release artifacts and current open PRs.
2. Audit the existing web feature surface against this matrix; distinguish live/verified from partial and planned.
3. Stabilize the canonical learner profile and shared subject catalogue before duplicating profile semantics in Android.
4. Complete native subject management and profile editing, then verify cross-client sync.
5. Deliver parity in vertical slices: Learn/Cortex, Exam Hub/Simulation, Math/subject tools, study organization/analytics/engagement, projects/careers/settings.
6. Finish local-first behavior and explicit per-feature offline contracts; consolidate rather than add a new queue.
7. Run release gates, produce a commit-matched artifact, test on device, then publish with honest release notes.

**Current truth:** Native Android is a real Kotlin/Compose project, but the existing Android README explicitly says feature parity is incomplete. This matrix is the contract for closing that gap, not evidence that the gap has already been closed.


## 2026-10-27 implementation update

- **Native profile and subject selection: Partial.** Searchable multi-subject selection, custom subjects, display name and study level are implemented in the Android Compose Profile screen. Cross-client persistence still requires a successful Android build and live Supabase/RLS verification.
- **Native focus timer: Partial.** A local 15/25/45-minute focus sprint timer is now available in the Practice workspace. It is a timer only; it does not yet sync focus sessions or statistics with the web Focus module.
- **Offline subject cache removal: corrected in source.** When a learner removes every subject from the profile, the native client now clears stale cached subjects. If subjects remain selected but the remote catalog is temporarily empty, the client preserves cached subjects to avoid accidental data loss.
- **Build/release: pending.** Do not treat these source changes as a release until the Android workflow succeeds and the artifact is checked against its source commit. Real-device verification remains required.


## Android build evidence update (2026-10-27)

- **Android CI: Verified for source commit** `ca79e8e9c2f143f215aed9ec9a3b911a611a05be`. Run: https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40495697345. The Android project validation and installable debug APK build both succeeded.
- **Debug artifact:** `shadecode-student-android-debug-190`, artifact ID `12730548795`, 39,665,719 bytes, expires 2026-11-10. Workflow artifact digest: `sha256:cf99587d365a0fa759b73ab00091876fee44729f1d9abaaf104f3ead97475cb7`. This digest is for the downloaded artifact archive, not the APK inside it.
- **Web CI:** run https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40495697478 completed successfully for the same source commit.
- **Native offline cache: In progress, not yet build-verified.** New account-scoped DataStore snapshots are being added for tasks and timetable. This is cached read access and local persistence for generated schedules, not yet a durable mutation queue or full offline sync. Do not describe offline task creation/completion as supported.
- **Release state:** PR #489 remains open. No physical-device smoke test, signed production APK/AAB, or production release is claimed.


## Android build evidence update (2026-10-27, browser-bridge commit)

- **Android CI: Passed** for commit `af498aa005a6e223c94b261f23559d23e2b9769a`. Run: https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40505226580. Project validation, debug APK build, and artifact upload succeeded.
- **Latest debug artifact:** `shadecode-student-android-debug-201`, artifact ID `12734633191`, 39,688,369 bytes, expires 2026-11-10. Workflow archive digest: `sha256:e09d6cc6760f6da2a9b0f7ad582f42f4d6ade17fda23977f112b51cb7becb5c6`. This is the archive digest, not an APK-internal checksum.
- **Web CI:** passed for the same commit: https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40505226226.
- **Scope warning:** the “More Shadecode tools” card opens the existing web modules in the browser. It is a bridge, not native feature parity. Native Exam Hub, Exam Simulation, Math Checker, Code Lab, Project Studio, and other linked modules remain open work.
- **Release state:** PR #489 remains open. No physical-device smoke test, signed production APK/AAB, or production release is claimed. Before release, validate the APK on the target Android device and verify account/session handling when opening web modules.


## Native Exam Hub build result (2026-10-27)

- Native Compose Exam Hub is implemented in the feature branch: subject-filtered syllabus browsing, level/session/year facets, paper listing, and authenticated paper-open requests.
- Android CI passed for commit `bfda64a19c3764462c2bb6c2e14b0d098f9f6980`: https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40575436582
- Commit-matched debug preview artifact: `shadecode-student-android-debug-210`, artifact ID `12767004581`, 39,733,920 bytes, expires 2026-11-10. Archive digest: `sha256:3e5a097848ccc182d886e19c828ea9de1d2255d39fd112531ca2409ef9ef5e7f`.
- Web CI passed: https://github.com/mahambatakunda2008-afk/shadecode-student/actions/runs/40575436616.
- Paper API source checks authentication and learner subject access, then creates a short-lived signed URL. Production schema/storage/RLS behavior still needs real-account verification.
- Still open: physical-device testing, paper viewer/download/offline handling, native Exam Simulation, Math Checker, remaining parity work, production signing and AAB. This is a debug preview, not a production release.


## Exam Simulation fallback update (2026-10-27)

- The user clarified that Cortex generation is currently failing and Exam Simulation must use existing past papers instead of depending on new AI-generated questions. Existing papers are already indexed in `syllabi` and `past_papers`, with secure opening through the native Exam Hub.
- The native Exam Simulation setup now offers **Start with a real past paper**, which routes the learner into Exam Hub's existing subject → level → session → year → paper selection flow. This provides a real-paper escape route when Cortex generation is unavailable; it does not claim the paper has been imported into the native timer/answer workspace yet.
- Fixed the native marking route's bearer-token whitespace parser while updating the fallback.
- Web CI run 40577624099 passed before these latest UI/API commits. Android CI run 40577624101 was still running when this entry was written; re-check it against the latest branch head before calling these changes build-verified.
- Remaining required work: make past-paper question papers the primary Exam Simulation source inside the simulation workspace, preserve timer/answers/resume, link the corresponding mark scheme, and only use Cortex for optional feedback when available. Do not record an authoritative score from client-supplied or unverified answers. Physical-device and production-runtime checks remain open.


## External resource discovery expansion (2026-10-27)

The native Exam Hub now includes a curated **More learning resources** directory that opens external resources in the browser. It currently links to:
- Cambridge International Resource Centre for syllabus-specific official papers, specimen papers, examiner reports and published resources.
- Official ZIMSEC syllabuses, specimen papers and published O Level paper downloads.
- Zimfundi as a Zimbabwe-focused third-party study resource.
- PhET for interactive maths/science simulations.
- Khan Academy for lessons and practice.
- CK-12 for free digital textbooks, adaptive practice and STEM interactives.
- OpenStax for free peer-reviewed textbooks.

This is a discovery directory, not a claim that external sites have been ingested into Shadecode's database or that all external materials are licensed for redistribution. The app should not scrape or republish third-party exam papers without checking access terms and reuse rights. Prefer official board sources, open educational resources and user-contributed material with provenance and permission.

### External resource references checked on 2026-10-27
- Cambridge International resource centre: https://www.cambridgeinternational.org/resource-centre/
- Cambridge guidance on papers and mark schemes: https://help.cambridgeinternational.org/hc/en-gb/articles/115004448905-Where-can-I-find-past-papers-mark-schemes-and-resources-for-our-exams
- ZIMSEC syllabuses: https://www5.zimsec.co.zw/syllabi/
- ZIMSEC specimen papers: https://www5.zimsec.co.zw/specimen-papers/
- ZIMSEC O Level downloads: https://www5.zimsec.co.zw/download-category/o-level/
- Zimfundi: https://zimfundi.co.zw/
- PhET: https://phet.colorado.edu/
- Khan Academy: https://www.khanacademy.org/
- CK-12: https://www.ck12.org/
- OpenStax: https://openstax.org/subjects

### Next implementation slice
Build the native Exam Simulation around existing indexed paper records rather than AI-generated question payloads: choose an actual question-paper record, open/render its PDF inside the app where practical, provide a timer and locally durable answer sheet, let learners attach the matching mark scheme for self-marking, and make Cortex feedback an optional post-attempt enhancement. Only score objectively when a trusted mark scheme or verified marking workflow exists. Continue to validate paper provenance, subject/board/level alignment, paper component and variant, and rights before importing more files.


## Offline past-paper library implementation update (2026-10-27)

- **Native offline paper library: Partial, source implemented.** The Exam Hub now offers a per-paper **Download for offline** action. It obtains a short-lived authenticated paper URL, downloads the PDF into app-private storage (50 MB per-file limit), validates the PDF signature, writes through a temporary file, indexes the file under the signed-in account, and can reopen/remove saved PDFs without a network connection. A FileProvider grants read-only access to the external PDF viewer; raw private file paths are not exposed.
- **Offline availability boundary:** the first download still needs a connection and the paper must already exist in the authorized catalogue. Once downloaded, reopening that PDF is offline. The catalogue itself and not-yet-downloaded papers still require network access.
- **Bundled real-paper packs are a separate release item.** Cambridge and ZIMSEC past papers may be copyrighted even when their PDFs are publicly reachable. Do not include them in the APK/AAB until Shadecode has explicit redistribution permission or a clearly applicable licence. Bundle only paper packs with recorded source, board/subject/year metadata, licence/permission evidence, attribution requirements and a checksum. Do not represent third-party links as permission to redistribute.
- **Not yet verified:** latest Android CI for the offline-library source changes is pending; no physical-device airplane-mode test has been performed. Test download → force-stop/reopen → airplane mode → open PDF → remove, plus account-switch isolation, before marking this Verified.


- **Bundled-pack importer scaffold added:** Android reads `android/app/src/main/assets/offline-papers/index.json` and imports only entries with source, attribution, licence/permission metadata, a safe asset path, PDF signature and matching SHA-256. The manifest is intentionally empty while rights to redistribute real Cambridge/ZIMSEC papers are not documented. This is pack infrastructure, not a claim that real past papers are currently bundled.


## Native real-paper attempt workspace (2026-10-27)

- **Implemented in source, CI/device verification pending:** question-paper entries now offer a timed attempt workspace. It opens the real PDF through the device's PDF viewer, provides a local answer/working sheet, saves notes and remaining time to app-private preferences, and supports pausing/resuming/finishing. Saved question papers can start an attempt directly while offline.
- The workspace pairs a mark scheme against paper number, variant, year, session and level. It can open the matching mark scheme from the loaded catalogue or from the account-scoped offline library, so a saved QP + saved MS pair can be reviewed without network. Device verification is still required.
- Timed attempts now offer selectable 30, 60, 90 or 120 minute durations before starting. The chosen duration is stored with each attempt, while an existing attempt retains its saved remaining time. The countdown is currently Compose-session based; elapsed-time reconciliation after force-stop/process death remains a known gap.
- **Scoring is intentionally self-assessed.** No AI-generated mark is treated as authoritative, no official score is stored, and no XP is awarded from this PDF workflow.
- Timer duration currently defaults to 60 minutes and is not yet configurable per syllabus/paper. The PDF is viewed externally rather than rendered inline. Diagrams and question-specific structured answer inputs are not yet part of this workspace.
- Test required before marking complete: download QP + mark scheme, start attempt, enter notes, force-stop/relaunch, enable airplane mode, reopen paper and notes, finish attempt, confirm the timer and notes restore correctly, then switch accounts and verify isolation.


### Crash-safe timed attempts update (2026-10-27)

- Timed past-paper attempts now persist a wall-clock deadline and running/paused state, not only a decrementing counter.
- Reopening an active attempt recalculates remaining time from its saved deadline, so force-stop, process death, device sleep, or time spent outside the screen no longer silently resets elapsed time.
- Pause captures the remaining seconds and clears the deadline; resume creates a fresh deadline. Returning to the catalogue leaves an active timer running, matching a real timed attempt.
- Expired attempts reopen as finished while retaining local answer notes. The timer/notes remain device-local and account-scoped.
- Still requires Android build confirmation and real-device checks for force-stop/relaunch, pause/resume, account isolation, and offline PDF opening. This is not yet a signed production release.


## 2026-10-28 native subject-filter correction

- **Exam Hub subject filtering: source implemented; CI pending.** Replaced substring matching with exact canonical subject keys and a small explicit alias map. Mathematics no longer implies Additional Mathematics or Further Mathematics; Computer Science and ICT aliases are handled explicitly. Added JVM unit tests and wired them into Android CI before the debug APK build.
- **Security boundary:** this is a user-experience and data-relevance correction, not authorization. The server must continue to validate learner access when creating signed paper URLs.
- **Verification state:** awaiting the Android workflow result for the latest commit. No phone test or release is claimed.

## Native Exam Simulation timer recovery hardening (2026-10-28)

- **Source implemented; CI pending.** Exam Simulation now persists a wall-clock deadline for an active timed paper. On activity/process recreation, remaining time is reconstructed from that deadline instead of subtracting time since the last autosave. The previous per-second autosave refreshed its timestamp every second, which could effectively pause the timer while the app was closed.
- When the timer reaches zero, answer inputs stop accepting changes and the learner can still submit the saved answers for marking. If marking fails after time has expired, the attempt remains expired rather than silently reopening.
- Deadline metadata is backward-compatible: older saved attempts without a deadline recover their last saved remaining time and establish a deadline when resumed.
- **Verification state:** Android and CI workflows are running for commit `9ec24f2c3f21455a1bd4d32fed01baf230201c94`. Do not mark build-verified until those runs finish. No physical-device test is claimed.

### Exam Hub catalogue discoverability (2026-10-28)

- Added a searchable filter above the selected-subject syllabus catalogue. Learners can search by subject, exam board, or available level instead of scrolling through every selected syllabus.
- Search is local to the already loaded authorized catalogue; it does not broaden access beyond the learner's selected subjects or claim that a syllabus has paper coverage when none is available.
- An explicit no-match message appears when a query returns no subject or board.
- Source change: `android/app/src/main/java/com/shadecode/student/NativeExamHub.kt`, commit `3133c74530e1bacefa4df3977d9116811319addb`.
- Build status must be checked in GitHub Actions. Physical-device interaction and large-catalogue usability remain unverified.

### Native Exam Hub: save complete matching exam bundles (2026-10-28)

- Added a **Save complete exam bundle** action to question-paper cards. It selects the question paper plus the first available matching mark scheme, insert and data/formula booklet for the same paper number and variant from the currently loaded exam session.
- Each file is downloaded through the existing authenticated signed-URL route and validated by the account-scoped offline store. Already-saved files are skipped; if one download fails, successfully saved files remain indexed and the error reports a partial bundle so the learner can retry.
- Bundle download is sequential and limited to the matching components available in the loaded catalogue; it does not claim that every paper has all components. It does not bundle files from other years/sessions or bypass redistribution restrictions.
- Source commits: `a8797e09` (bundle action), `1a6b9dfb` (correct per-card progress and disable conflicting actions).
- Android build status must be checked for these commits. Device/network interruption behavior remains unverified until runtime testing.

### Native offline paper library search and filtering (2026-10-28)

- Added a local search field to the **Available offline on this device** section. It matches subject, exam board, level, session, year, title, paper number, variant and paper kind.
- Added quick filters for all saved PDFs, question papers, mark schemes and other components. The filter row scrolls horizontally on narrow phones instead of forcing all chips into the screen width. Search and filtering operate only on the already-saved, account-scoped local index; they do not need internet access.
- Added a clear no-results state when the search/filter combination has no matches.
- Source change: `android/app/src/main/java/com/shadecode/student/NativeExamHub.kt`, commits `8dbc284eac836d530da03659109d0caf8de93dd0` and `ac6da8e404b9618b5d2d5431d8f26f9e531255fe`.
- **Verification state:** Android workflow `40745018511` was pending and CI workflow `40745017608` was in progress when documented. Do not claim build verification until the Android workflow succeeds. No physical-device test is claimed.

### Native offline paper library: safer deletion (2026-10-28)

- The **Remove** action now asks for confirmation and names the saved subject/paper before deleting the local copy. Learners can cancel and keep it, reducing accidental loss of offline materials.
- The confirmation explains that the paper is removed from this device and can be downloaded again when connected. It does not delete any server-side source paper.
- Source commit: `7722a5435091efa009fbe264d11859b9e3034880`.
- **Build investigation:** Android workflow `40745178820` failed during the environment's **Validate Android project** step while installing Android NDK `27.0.12077973`, with `java.util.zip.ZipException: Archive is not a ZIP archive`. This occurred before the app compile step, so it does not establish a Kotlin source failure. CI for the responsive filter change passed (`40745178085`), but Android compilation must pass on a fresh run before the recent UI changes are considered build-verified. No physical-device test is claimed.
