# Android Native Architecture and Feature-Parity Audit

**Date:** 2026-11-12  
**Repository:** `mahambatakunda2008-afk/shadecode-student`  
**Scope:** Read-only audit of the Android Kotlin/Compose client and comparison with the existing web application. This document records verified code evidence; it does not claim device testing or a successful Android build.

## Executive assessment

The Android client is a genuine native Kotlin/Jetpack Compose application, not a WebView wrapper. It already contains useful native foundations: Room, DataStore, WorkManager, local exam-attempt recovery, offline paper storage, on-device OCR, and multiple Cortex/local-model adapters.

It is **not yet a complete native equivalent** of the web product. The current Android shell exposes a smaller set of workflows, and several persistence/synchronisation boundaries need hardening before expanding the feature surface.

**Overall status: Native foundation established; feature parity, offline durability, and architecture modularisation remain in progress.**

## 1. Verified Android implementation

| Area | Evidence in repository | Assessment |
|---|---|---|
| Native UI | Jetpack Compose and Material 3 in `MainActivity.kt` and feature files | Implemented |
| Authentication | Supabase password sign-in and refresh in `NativeApi.kt` | Basic flow implemented; session lifecycle needs hardening |
| Student profile | Profile cache in `NativeStore.kt`; profile API in `NativeApi.kt` | Basic profile and subject setup implemented |
| Subject catalogue | `NativeSubjectCatalog.kt`, `NativeSubjectMatcher.kt`, Room subject cache | Implemented baseline |
| Lessons | `NativeLessonReader.kt`, lesson API, Room lesson/progress entities | Partial; full curriculum and parity need verification |
| Dashboard | Dashboard, tasks, Cortex insights, exam entry cards | Partial |
| Tasks | Remote task API plus local cache and queued create/complete operations | Partial offline support |
| Timetable | Screen, cache and queued replacement operation | Partial offline support |
| Focus | In-memory countdown and remote completion call | No durable timer/recovery or durable offline completion queue verified |
| Exam hub | `NativeExamHub.kt`, paper catalogue and signed URL retrieval | Partial; remote catalogue needs connection |
| Exam simulation | `NativeExamSimulation.kt`, native generation/mark endpoints | Partial; cloud endpoints required for generation/marking |
| Exam recovery | `NativeExamAttemptStore.kt` | Local snapshot exists; persistence is SharedPreferences-based and needs lifecycle/security tests |
| Offline papers | `NativeOfflinePaperStore.kt` | Local PDF storage, hash/provenance checks for bundled papers, integrity checks and private file provider |
| Snap & Extract | Native image picker and bundled ML Kit Latin OCR in `MainActivity.kt` | Basic local OCR; no graph/diagram understanding, source-image archive, or image-pixel redaction |
| Cortex | `NativeCortexRouter.kt`, `NativeCortex.kt`, `NativeCloudCortex.kt`, `NativeCortexOrchestrator.kt`, local model runtime files | Multiple native routes exist; durable cross-session memory/cache and broad workflow integration need verification |
| Local models | `LlamaCppRuntime.kt`, local model catalogue/manager/runtime | Foundation exists; supported device matrix and real-device performance remain unverified |
| Settings/customisation | Profile screen and limited theme constants in main activity | Does not demonstrate the full user-controlled UI/layout customisation requirement |
| Notifications / background work | WorkManager sync worker | No comprehensive user-facing native notification/background capability demonstrated |
| Camera, microphone, Bluetooth, USB, printing, stylus | No complete end-to-end feature implementation verified in inspected Android manifest/screens | Not parity-complete |

## 2. Verified Android shell and web parity gaps

The Android bottom navigation currently exposes six destinations: Home, Learn, Practice, Extract, Profile, and Plan. Exam Hub and Exam Simulation open as separate screens from the dashboard.

The web application has substantially more product areas under `src/app/(app)`, including:

- Achievements and leaderboard
- Analytics and insights
- Careers and discovery
- Code Lab and Computer Science Lab
- Curriculum
- Exam Hub, exam simulation, and exams
- Focus
- Learn
- Math Checker and Math Cortex
- Practical Practice
- Projects
- Study Plan, Study, and Studyspace
- Subjects
- Tasks and timetable
- Support, feedback, and Workmate
- Settings and account-related flows

This is a route-level comparison, not a claim that every web route is a finished or universally available feature. Each route still needs a product capability audit. However, the Android client does not currently expose equivalents for many of these areas.

### Priority parity backlog

| Priority | Web capability / student workflow | Android gap to close |
|---|---|---|
| P0 | Account identity, profile, curriculum, subject selection | Align all profile fields and subject/board/level selection with web; handle account changes safely |
| P0 | Learn and lesson progress | Full offline lesson catalogue, prerequisites, mastery, progress recovery and content-versioning |
| P0 | Exam Hub and timed attempts | Broader paper/component support, durable answer autosave, force-close recovery, marking and progress parity |
| P0 | Cortex academic memory and insights | Durable learner memory, observations, recommendations, and continuity across sessions |
| P0 | Settings and user control | Full appearance, layout, accessibility, notification, privacy, and customisation controls |
| P0 | Offline operation | Durable local writes, queue correctness, explicit sync status, and conflict resolution |
| P1 | Practical Practice | Practical skills, task tracking, feedback and revisit recommendations |
| P1 | Math Checker / Math Cortex | Native handwriting capture, recognition, correction, and maths workflow parity |
| P1 | Study Plan / Tasks / Timetable / Focus | Persisted schedules, tasks, timer state, and offline completion recovery |
| P1 | Achievements / Leaderboard | Local state and transparent sync of XP, streaks, badges and ranking |
| P1 | Code Lab / Comp Lab / Projects | Native coding workspace, file handling and offline project storage |
| P1 | Studyspace / discovery / careers | Research, discovery and study workflows |
| P2 | Analytics / feedback / support / Workmate | Feature-specific parity assessment and native implementations |

## 3. High-risk architecture findings

### A-01 — MainActivity is an oversized application container
**Severity: High**

`MainActivity.kt` is 93,085 characters and 1,596 lines. It contains app startup, session restoration, onboarding, navigation, dashboard, timetable, learning, profile, and Snap & Extract UI.

**Risk:** UI changes, state changes, and feature work are coupled in one file. This increases regression risk and makes parallel platform parity work harder.

**Required action:** Extract by feature and responsibility. Keep `MainActivity` as a small host; create navigation destinations, ViewModels/state holders, repositories, and platform services. Preserve existing behavior during extraction. Do not perform a wholesale rewrite.

### A-02 — DataStore JSON queue lacks explicit idempotent server contract
**Severity: Critical**

`NativeStore.enqueuePendingOperation` creates a local UUID and stores operations as a JSON array in DataStore. The sync worker re-reads the queue after each operation, which correctly handles local task-ID reconciliation. However, the inspected `NativeApi.createTask`, `completeTask`, and timetable methods do not send a server-recognised idempotency key or expected revision.

**Risk:** If the server commits a mutation but the client loses the response, retry may create duplicates or overwrite a newer timetable. A local queue UUID alone does not make the server operation idempotent.

**Required action:** Introduce a versioned sync-operation contract with operation ID, account ID, entity ID, base revision, payload schema version, created timestamp, and explicit result. Add server-side idempotency handling before retrying non-idempotent writes. Add conflict states and reconciliation UI.

### A-03 — Two sync queues have different ownership and guarantees
**Severity: Critical**

The client has both:
- DataStore JSON operations in `NativeStore`, scoped by account ID.
- Room `pending_sync` rows in `NativeRoom`, with no account ID or idempotency key.

The Room queue is used for lesson progress; the DataStore queue is used for tasks and timetable. The worker processes them separately.

**Risk:** Different features have different durability, account isolation, retry, and conflict semantics. Room pending rows can outlive or be replayed after an account switch without an explicit owner check.

**Required action:** Consolidate mutations into one account-scoped Room outbox. Include operation ID, account ID, entity key, operation type, payload version, base revision, attempts, last error, and timestamps. Use Room transactions to save local state and enqueue the corresponding mutation atomically. Migrate legacy pending operations safely.

### A-04 — Sign-out clears all DataStore values
**Severity: Critical**

`NativeStore.clearSession()` calls `context.nativeStore.edit { it.clear() }`. The same DataStore holds session tokens, cached profile, cached tasks, cached timetable, and account-scoped pending operations.

**Risk:** Signing out can delete offline work and queued mutations, including work that has not synced yet. This is unacceptable for an offline-first learning product.

**Required action:** Separate authentication/session storage from durable academic data and outbox. Sign-out should remove credentials and active-account pointers only. Pending operations must be retained per account, with a deliberate account-removal/data-wipe flow and clear confirmation.

### A-05 — Focus completion is not durably queued
**Severity: High**

The focus timer is held in Compose state in `StudentShell`. Completion calls `api.completeFocusSession`; on failure the UI reports sync failure, but the inspected flow does not persist a pending completion operation or restore the timer after process death.

**Risk:** A completed study session can be lost after connectivity failure or app termination.

**Required action:** Persist timer/session state and enqueue completion atomically. Use monotonic elapsed-time accounting where possible and define behavior after reboot, clock changes, pause, and force-stop.

### A-06 — Authentication/session storage and lifecycle need a security pass
**Severity: High**

Access and refresh tokens are stored in Preferences DataStore by `NativeStore`. The inspected startup restores a session and attempts profile refresh, but no comprehensive encrypted-token storage, refresh serialization, expiry-aware recovery, or account-switch test suite was found.

**Risk:** Token handling, parallel refreshes, and account changes can produce inconsistent state. Offline access must not depend on a currently valid cloud token once the user has already authenticated and downloaded content.

**Required action:** Document the threat model; use Android Keystore-backed encryption for sensitive session material; centralise refresh and serialize it; test expiry, revocation, offline launch, account switching, and sign-out.

### A-07 — Offline exam recovery is not yet production-grade
**Severity: High**

`NativeExamAttemptStore` stores a single user-scoped attempt snapshot in SharedPreferences. The stored state includes paper/questions/answers, remaining seconds, taking flag, save time and deadline.

**Risk:** One snapshot per user can limit multiple attempts; SharedPreferences `apply()` is asynchronous; there is no visible versioning, transactional relationship to an exam attempt, schema migration, or encrypted storage in the inspected implementation.

**Required action:** Move attempt state to Room with attempt IDs, paper/component IDs, answer revision, elapsed/deadline policy, save timestamps, schema version, and transactional autosave. Add force-close and device-restart tests.

### A-08 — Room schema and migration governance need strengthening
**Severity: High**

`NativeRoom.kt` has Room database version 2, four entities, and a hand-written 1-to-2 migration. Schema export is disabled.

**Risk:** Future data evolution is difficult to review and migration regressions may destroy offline student work.

**Required action:** Enable schema export and commit Room schemas. Add migration tests from every supported version. Include account ownership and revisions in durable student data/outbox tables.

### A-09 — Profile and subject refresh can produce stale or ambiguous local state
**Severity: High**

Profile is cached in DataStore, subjects and lessons in Room. Profile loading, subject refresh, and local cache replacement occur in multiple places in `StudentShell` and onboarding/profile callbacks.

**Risk:** Cache refresh behavior is distributed across UI callbacks; partial failures can leave profile, subject cache and lesson cache inconsistent.

**Required action:** Create a single profile/subject repository with transactional cache updates, explicit freshness metadata, and account ownership. Make setup changes locally durable before remote sync.

### A-10 — Network layer is synchronous and duplicated
**Severity: Medium**

`NativeApi` uses `HttpURLConnection` and blocking methods. Callers frequently wrap it in `Dispatchers.IO`. There are separate request paths for Supabase REST and application API endpoints, with different timeout/error handling.

**Risk:** Inconsistent retry/error parsing, cancellation behavior, token refresh, and testability.

**Required action:** Move to a single injectable suspend network client (e.g. OkHttp/Ktor) with typed errors, cancellation, secure URL policy, structured logging without secrets, centralized auth refresh, and test doubles. Do not change endpoints or auth semantics without contract tests.

### A-11 — Local AI cache is process-memory-only in inspected route
**Severity: Medium**

`NativeCortex` has an eight-entry in-memory lesson cache. `NativeCortexRouter` has a cache route, but the inspected cache itself is not durable across process restart. The orchestration path can use Gemini Nano, a local GGUF runtime, and cloud generation.

**Risk:** Previously generated lessons can be regenerated after restart, wasting data/model time. The existence of a CACHE route does not itself prove a persistent cache lookup.

**Required action:** Add a versioned Room-backed generated-content cache keyed by curriculum, subject, topic, level, locale, prompt/model version, and content schema. Verify quality and freshness before reuse. Keep student-specific memory distinct from reusable generated lessons.

### A-12 — Feature-level testing is very thin
**Severity: High**

The inspected Android unit-test directory contains `NativeSubjectMatcherTest.kt`; no tests were found there for the sync worker, Room migrations, offline stores, exam recovery, auth lifecycle, or Cortex routing.

**Risk:** Critical offline and account-isolation guarantees are not protected by automated tests.

**Required action:** Add unit, coroutine, Room/instrumentation, migration, API contract, and UI tests. Add failure-injection tests for duplicate delivery, server commit with lost response, expired tokens, force-close, low storage, interrupted download, account switching, and conflict resolution.

## 4. Recommended refactor sequence

Do this in small, behavior-preserving slices. No wholesale rewrite and no new UI framework.

### Slice 1 — Protect student work first
1. Separate credentials from academic cache and queued work.
2. Ensure sign-out cannot erase unsynced work.
3. Add account ownership to all durable records and queue entries.
4. Add tests for sign-out, sign-in as another learner, and return to the original learner.

### Slice 2 — Unify offline persistence
1. Introduce the Room outbox schema.
2. Add operation IDs, idempotency keys, payload versions and revision metadata.
3. Migrate existing DataStore and Room queue entries without dropping them.
4. Add atomic repository methods that save local state and enqueue work in one transaction.
5. Add retry/backoff, dead-letter/manual-retry state, and conflict surfacing.

### Slice 3 — Recoverability
1. Move exam attempts to Room.
2. Persist focus sessions and completions.
3. Add durable lesson progress and content versioning.
4. Add force-close, process death and reboot tests.

### Slice 4 — Modularise the Android UI
1. Keep MainActivity as the host.
2. Extract app shell/navigation.
3. Extract onboarding/auth.
4. Extract dashboard/tasks.
5. Extract learning and lesson reader.
6. Extract exam hub and exam simulation.
7. Extract practice/focus/timetable.
8. Extract Snap & Extract.
9. Extract profile/settings.
10. Introduce ViewModels and state holders without changing student-visible behavior.

### Slice 5 — Feature parity
Build the Android feature matrix from the P0/P1/P2 list above. Implement student-critical learning and exam workflows first. Every feature must specify:
- Offline behavior and content prerequisites.
- Local persistence and recovery behavior.
- Remote API and server contract.
- Account isolation.
- Accessibility and customisation.
- Test evidence and platform limitations.

## 5. Immediate implementation order

**Next coding task: Slice 1, protect student work across sign-out and account switching.**

Before modifying the storage model:
1. Inspect all consumers of `clearSession()`.
2. Inspect all DataStore keys and all Room entities/queue writes.
3. Add regression tests for current and intended behavior.
4. Split session clearing from deliberate local-data deletion.
5. Verify that account A's cached work and pending queue remain available only to account A after account B signs in.

Do not begin the large UI extraction until these data-loss risks are contained.

## 6. Explicitly unverified

This audit is based on repository source inspection on 2026-11-12. It does **not** establish:
- That the current branch builds successfully.
- That the latest signed APK/AAB corresponds to the current source commit.
- That the app has been tested on physical Android devices.
- That every listed web route is fully functional or should be ported unchanged.
- That background execution, OCR, local model inference, camera, Bluetooth, USB, or printing work on every supported device.
- That offline sync is conflict-safe or server-idempotent.

These require CI evidence, API/database contract inspection, and real-device testing.
