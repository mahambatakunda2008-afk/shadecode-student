# Shadecode Student: Cross-Platform Local-First Adoption Matrix
**Date:** 2026-11-12  
**Scope:** Web, installable PWA, Android, desktop (Tauri), and iOS/PWA where supported.  
**Status:** Source-level inventory, not a claim of device-tested offline completeness.

## Purpose
This matrix tracks whether each student workflow can be opened, read, changed, recovered, and synchronized across every supported platform when the network is unavailable. A cached route is not equivalent to an offline-capable feature.

## Status vocabulary
- **Verified in source:** implementation evidence exists in the inspected repository; this is not a device test.
- **Partial:** a foundation exists, but the complete workflow is not covered.
- **Online-dependent:** the inspected path requires a remote service.
- **Not established:** no adequate evidence found in the inspected files.
- **Device verification required:** browser/device/runtime behaviour cannot be proven by source inspection.

## Platform baseline

| Platform | Current evidence | Offline classification | Required proof |
|---|---|---|---|
| Web browser | Next.js app, service worker, IndexedDB/local-first libraries | Partial | Fresh browser profile, airplane mode, reload, every critical route and mutation |
| Installable PWA | Service worker v7, production registration, route warm-up | Partial | Install, close/reopen, cold launch in airplane mode, update/cache migration |
| Android | Signed cloud-built APK/AAB artifacts exist; web app capabilities are not proof of native offline parity | Not established end-to-end | Real Android device, airplane mode, WebView storage/model tests, process kill/restart, low-storage test |
| Desktop (Tauri) | Tauri 2 shell foundation previously identified; complete offline workspace not established | Not established end-to-end | Installed desktop build, network disabled, restart, local data durability, update/rollback |
| iOS | No native iOS implementation established in this audit; PWA path may be installable depending on browser/OS support | Not established | Supported iPhone/iPad versions, installed PWA, offline launch and storage tests |

## Cross-platform workflow matrix

| Workflow / data | Web | PWA | Android | Desktop | iOS | Current evidence / gap |
|---|---|---|---|---|---|---|
| Sign-in and account bootstrap | Online-dependent | Online-dependent for fresh auth | Device verification | Device verification | Device verification | Authenticated user is required by sync; offline sign-in/session restoration behaviour is not proven. Never bypass account ownership checks. |
| App shell and core routes | Partial | Partial | Device verification | Not established | Not established | Service worker warms 13 core routes and caches selected responses. Warmed pages are snapshots; lazy chunks and API data may still be missing. |
| Curriculum catalogue | Not established | Not established | Not established | Not established | Not established | Subject availability must be distinguished from complete offline syllabus, lessons, diagrams and assessment content. |
| Lesson content | Partial | Partial | Device verification | Not established | Not established | Selected tutorial text/assets have caching support (PR #569 context); full syllabus and all lesson assets are not proven locally available. |
| Lesson progress | Partial | Partial | Device verification | Not established | Not established | Local-first progress helpers exist; sync route currently accepts tasks, subjects and learn_lessons only. End-to-end lesson-progress sync mapping requires verification. |
| Cortex chat / tutoring | Online-dependent by default | Online-dependent by default | Device verification | Not established | Not established | Router uses in-memory memory then TeacherAI by default. Compact local model is opt-in, generic, and not evidence of subject-grounded offline tutoring. |
| Persistent student memory | Not established | Not established | Not established | Not established | Not established | Current CortexMemory is an in-process array, limited to 50 entries/user. It is lost on reload/process termination and is not durable cross-device memory. |
| Tasks | Partial | Partial | Device verification | Not established | Not established | Queue/store and sync foundations exist; verify actual ExperienceTasks reads/writes, restart recovery, server acknowledgement and conflict handling. |
| Timetable | Partial, local-first adapter added | Partial, shared browser storage path | Device verification required | Device verification required | Device verification required | `src/lib/local-first/timetable.ts` stores the schedule in the shared local-first IndexedDB store. The timetable screen reads cached session identity, opens the local schedule first, saves locally before attempting `replace_own_timetable`, and retries pending sync on reconnect. Native storage parity and airplane-mode behaviour remain unverified. |
| Practice / exam attempts | Not established | Not established | Not established | Not established | Not established | Deterministic offline exam generation exists for covered topics, but attempt answers, timing, finalization, marking and recovery need separate proof. |
| Past papers and attachments | Partial | Partial | Device verification | Not established | Not established | Download/cache support exists for selected assets. Need explicit downloadable paper packs including diagrams, images, graphs and mark schemes. |
| Notes / annotations | Not established | Not established | Not established | Not established | Not established | No end-to-end local write/read/sync evidence established. |
| XP, streaks, achievements | Not established | Not established | Not established | Not established | Not established | Must be durable and idempotent offline; no verified full local-first workflow in inspected evidence. |
| Focus sessions | Not established | Not established | Not established | Not established | Not established | Need local timer state, background/foreground handling, interruption recovery and later sync. |
| Notifications / reminders | Not established | Not established | Not established | Not established | Not established | Platform permissions and scheduling differ; no cross-platform offline parity established. |
| Handwriting capture / OCR | Not established | Not established | Not established | Not established | Not established | On-device OCR and offline correction are not proven. Cloud OCR must be labelled online-only. |
| UI preferences | Partial | Partial | Device verification | Not established | Not established | Light/dark preference persists in localStorage; full dashboard, navigation, density, typography and workspace customization not established. |
| Student control / intent fidelity | Not established | Not established | Not established | Not established | Not established | Exact quantity, format, topic, difficulty and method constraints need shared validation across all clients and server generation. |
| Data export/import | Partial | Partial | Device verification | Not established | Not established | Local-first store supports a versioned user-scoped bundle import/export. UI availability and platform file handling are not established. |
| Conflict handling | Partial | Partial | Device verification | Not established | Not established | Local-first operation/conflict structures exist. Full user-visible resolution and multi-device convergence need tests. |
| Offline recovery after force-close | Not established | Not established | Not established | Not established | Not established | Must test pending writes and in-progress assessments after browser/app/desktop process termination. |

## Shared backend and local data findings

1. `public/sw.js` caches selected same-origin documents, RSC responses and static assets. It intentionally does not intercept API requests, non-GET requests, cross-origin requests or requests carrying Authorization. Route caching alone therefore cannot make data workflows offline.
2. `src/lib/offline/warmPolicy.ts` lists 13 core routes. `OfflineWarmup` preloads routes after sign-in and respects data-saver/2G guards. This is a warm-cache strategy, not a complete offline content pack.
3. `src/lib/offline/mutationQueue.ts` stores user-scoped mutations in IndexedDB. Its allowlist includes tasks, subjects, learn_lessons, projects, project_evidence and project_milestones.
4. `src/app/api/sync/route.ts` currently allows only tasks, subjects and learn_lessons. The difference between queue allowlist and server allowlist must be reconciled before claiming those other entities synchronize.
5. The inspected sync endpoint requires an authenticated user, validates owner identity, and applies mutations through `apply_sync_mutation`. Preserve these checks. Offline support must never mean weaker authorization.
6. `src/lib/local-first/store.ts` supports user-scoped records, operations, conflicts, lesson progress and versioned export/import bundles. This is useful infrastructure, but adoption by individual screens remains incomplete.
7. `src/lib/cortex/memory.ts` is volatile in-process memory. It is not persistent student memory.
8. `src/lib/cortex/router.ts` checks memory first but uses TeacherAI by default. The compact local model is opt-in and must not be advertised as complete subject-grounded local intelligence.
9. The settings appearance path persists light/dark mode locally. Full student-controlled layout and navigation customization is not established.
10. Timetable has now been moved onto a shared local-first path: cached session identity is read locally, the schedule is loaded from IndexedDB first, saves are durable locally before the existing ownership-safe `replace_own_timetable` RPC, and pending local operations retry when connectivity returns. This is a source-level implementation, not yet a verified device test.

## Delivery order for ALL platforms

### P0. Define one shared offline contract
For every feature, record:
- data owner and user scope;
- local source of truth;
- local read path;
- local create/update/delete path;
- durable queue and operation id;
- server sync mapping and authorization;
- conflict policy and user-visible recovery;
- export/import behaviour;
- platform storage implementation;
- offline acceptance test.

No feature is "offline-ready" until its entire user journey passes, not just its landing page.

### P1. Close the existing local-first loop
1. Trace every task, subject, lesson and progress consumer.
2. Reconcile queue allowlist with server sync allowlist.
3. Add automated tests for create/update/delete, duplicate replay, cross-user rejection, conflict, retry and restart recovery.
4. Move timetable to a local-first repository with a safe server sync contract.
5. Add explicit local-first repositories for notes, focus sessions, exam attempts and preferences before changing their screens.
6. Keep server as the synchronization authority for cross-device convergence while allowing durable local work offline.

### P2. Build a shared offline content manager
- Explicit download controls for curriculum units, lessons, past papers, mark schemes, diagrams and required media.
- Show pack size, available device storage, download state, version, last validation and delete controls.
- Verify pack integrity and curriculum version.
- Never imply remote video or cloud AI is offline.
- Provide a clear offline catalogue of content already on the device.

### P3. Durable student state and control
- Persist learning history, preferences, approved memory facts, progress and unfinished work in user-scoped durable storage.
- Give students view/edit/delete/export controls for their memory and preferences.
- Add dashboard widget visibility/order, navigation visibility/order, theme, accent, typography, density, workspace layout and notification preferences.
- Sync preferences safely across platforms, with local availability when offline.
- Make student intent constraints structured, validated and consistent across clients and server generation.

### P4. Platform adapters
Use shared domain/repository contracts, with platform-specific storage and lifecycle adapters:
- Web/PWA: IndexedDB, service worker, browser storage quota/eviction handling.
- Android: durable app storage and lifecycle-safe background sync; test WebView compatibility and local model runtime before enabling claims.
- Desktop/Tauri: durable local database/filesystem, process restart recovery and controlled sync.
- iOS: first prove the supported PWA/native delivery route, storage limits and lifecycle behaviour; do not imply native parity until implemented and tested.

### P5. Platform release gates
A platform can be labelled **Offline-ready** only when all P0/P1 journeys pass on a clean install and after force-close/restart with network disabled. A platform can be labelled **Download required** only when explicit content/model packs are downloaded and verified. Any cloud-only action must be labelled **Online-only**. Anything not tested remains **Unverified**.

## Minimum acceptance suite (run separately on every platform)
1. Sign in while online, download required packs, then enable airplane mode.
2. Cold launch and navigate to every claimed offline route.
3. Open a lesson, read all media, answer an activity and save progress.
4. Create/edit/delete a task and timetable entry; confirm local persistence.
5. Start an exam, answer questions, close the app/process, reopen offline and recover the attempt exactly.
6. Create a note and capture handwriting; verify whether OCR is genuinely local.
7. Use Cortex with network disabled. If local model is unavailable, show a truthful offline capability state and provide cached/local study tools without pretending a cloud answer was generated.
8. Change dashboard and navigation preferences; restart offline and confirm they persist.
9. Reconnect; verify queued operations sync once, conflicts are surfaced, and no duplicate XP or assessment submission occurs.
10. Sign out and sign in as another account; prove that local data from the previous user is not exposed.
11. Test low-storage, browser storage eviction, interrupted downloads, app update and schema migration.
12. Repeat on a second device/account to verify cross-device convergence.

## Evidence boundary
This document records static source inspection and prior repository context. It does not certify airplane-mode behaviour, Android/iOS device support, desktop release completeness, local OCR, local AI quality, or full syllabus coverage. Update each row only when a reproducible test and platform/version evidence are attached.

## Immediate next implementation slice
The first timetable slice is implemented in `src/lib/local-first/timetable.ts` and `src/app/(app)/timetable/page.tsx`. Next, add automated tests for local save, restart recovery, deferred sync, and cross-account isolation, then migrate lesson progress and notes using the same contract. This slice currently uses the browser IndexedDB adapter shared by browser-based runtimes; Android WebView, Tauri and iOS storage/lifecycle parity still require platform tests and, where necessary, native adapters.
