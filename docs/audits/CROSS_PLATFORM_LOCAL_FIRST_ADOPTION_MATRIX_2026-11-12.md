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
| Lesson progress | Partial, local completion persisted | Partial, shared browser storage path | Device verification required | Device verification required | Device verification required | Lesson completion now writes to the user-scoped local-first progress operation log, restores pending local progress over stale cached/server lesson snapshots, and uses the authenticated PATCH when online. Reconnect sync uses the existing learn_lessons mutation path. XP award after offline completion is not yet guaranteed; native platform behaviour remains unverified. |
| Cortex chat / tutoring | Online-dependent by default | Online-dependent by default | Device verification | Not established | Not established | Router uses in-memory memory then TeacherAI by default. Compact local model is opt-in, generic, and not evidence of subject-grounded offline tutoring. |
| Persistent student memory | Not established | Not established | Not established | Not established | Not established | Current CortexMemory is an in-process array, limited to 50 entries/user. It is lost on reload/process termination and is not durable cross-device memory. |
| Tasks | Partial | Partial | Device verification | Not established | Not established | Queue/store and sync foundations exist; verify actual ExperienceTasks reads/writes, restart recovery, server acknowledgement and conflict handling. |
| Timetable | Partial, local-first adapter added | Partial, shared browser storage path | Device verification required | Device verification required | Device verification required | `src/lib/local-first/timetable.ts` stores the schedule in the shared local-first IndexedDB store. The timetable screen reads cached session identity, opens the local schedule first, saves locally before attempting `replace_own_timetable`, and retries pending sync on reconnect. Native storage parity and airplane-mode behaviour remain unverified. |
| Practice / exam attempts | Partial, local draft recovery exists | Partial, shared browser storage path | Device verification required | Device verification required | Device verification required | ExamWorkspace autosaves answers, question index, timer, flags and working into local study storage/localStorage; ExamAttemptLocalBridge mirrors authenticated attempts into the user-scoped IndexedDB local-first store. Offline deterministic marking exists. Cached-session restoration now avoids a network-dependent getUser lookup. Exam mark requests now include the stable workspace attempt ID, allowing the server's existing mastery-projection event claim to suppress duplicate mastery projection for retries with that ID. A submitted local attempt is also marked `submitted` in the user-scoped local-first attempt ledger when that record exists. However, duplicate-safe exam_results row creation, full server-side idempotency for all Cortex/event side effects, reward replay and cross-device recovery are not yet established. |
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


## 2026-11-12 implementation update: lesson completion

- `src/app/(app)/learn/[lessonId]/page.tsx` now saves completion through `offlineStorage.saveProgress`, which delegates to `localFirstStore.saveProgress` and records a user-scoped operation.
- Pending local progress takes precedence over an older downloaded lesson snapshot or stale server response when restoring the lesson.
- Online completion continues through the authenticated `PATCH /api/learn` route; only after a successful server response is the local progress operation acknowledged.
- Offline completion remains locally saved and visibly labelled "sync pending". The existing reconnect listener calls the canonical offline sync pipeline.
- XP is deliberately not claimed as earned while offline. The current completion award is coupled to the online PATCH route; an idempotent deferred reward ledger is still required before offline completion can safely grant XP.
- This is a source implementation only. It has not passed a clean-install airplane-mode test or native Android, Tauri, or iOS lifecycle verification.


## 2026-11-12 implementation update: private lesson notes

- The lesson reader now exposes a personal notes area.
- Notes are stored as a user-scoped `study_state` record in the canonical IndexedDB local-first store. They are not written to the lesson content table or sent to the cloud.
- Notes restore on lesson reopen and save automatically after a short debounce. Account changes are guarded so one account's notes are never written under another account's identity.
- The notes status says "Saved on device"; it does not imply cloud backup or cross-device sync.
- Notes currently remain device-local. Export/backup and cross-device sync are separate future work.
- Source implementation is committed; no clean build, airplane-mode, force-close, or native-platform lifecycle test has yet been completed.


## 2026-11-12 implementation update: exam attempt recovery

- The existing ExamWorkspace already autosaves the question set, answers, current question, remaining/total time, flags and working while an attempt is active. It can offer a saved attempt for resumption and has deterministic local marking when remote marking is unavailable.
- ExamAttemptLocalBridge mirrors authenticated active attempts into the user-scoped `exam_attempt` IndexedDB entity and can restore a saved active attempt into the existing workspace snapshot.
- Both the bridge and ExamWorkspace now resolve the cached Supabase session with `auth.getSession()` rather than requiring `auth.getUser()` for local identity bootstrap. This removes an avoidable network lookup from the recovery path when a valid session is already cached; it does not enable fresh offline sign-in.
- Submission and result persistence still need an idempotent server contract before queued submission/reward replay can be considered safe. The current offline marking path must not be interpreted as cloud grading or cross-device result sync.
- This is a source-level improvement only. No airplane-mode, force-close, storage eviction, Android WebView, Tauri or iOS test has been run for this slice.


## 2026-11-12 implementation update: stable exam submission identity

- ExamWorkspace now sends its stable workspace `workId` as `attemptId` to `POST /api/exam/mark`.
- The mark route already accepts optional `attemptId` and uses it to derive a stable mastery-projection event key. This change connects the client attempt identity to that existing deduplication path, so a retry with the same ID can avoid projecting the same attempt into topic mastery twice.
- After marking, ExamWorkspace marks the matching local `exam_attempt` record as `submitted` when available, retaining its answers and submission timestamp in the user-scoped local store.
- Important boundary: this does not yet make every server side effect idempotent. The mark route still performs other Cortex/event/memory work outside a single atomic submission ledger, and the client still inserts into `exam_results` without a confirmed unique attempt key. No schema change was made because the table definition and deployed migration state were not verified in this pass.
- This is source-level only. No clean build, database migration, airplane-mode, or device lifecycle test has been completed.


## 2026-11-12 implementation update: recoverable exam submission ledger

- Added `exam_submission_ledger`, uniquely keyed by `(user_id, attempt_id)`, storing a payload hash and the authoritative server-marked result.
- The claim RPC returns the completed result for a replay, rejects a changed payload under the same attempt identity, and allows a processing claim to be reclaimed after three minutes.
- Reclaimed claims receive a rotated lease token. Finalization requires the current token, fencing off a worker whose lease expired while it was still running.
- The route claims before Cortex/event/memory/mastery projection side effects and finalizes the result after those operations. Existing mastery projection event identity remains stable. Cortex memory exam-score entries now carry a submission identity and replace an earlier entry with the same identity when replayed.
- ExamWorkspace now writes `attempt_id` with the result row. A unique index is added to `exam_results(user_id, attempt_id)` only if that legacy table exists. On a duplicate insert, the client retrieves the existing result instead of attempting an UPDATE, avoiding a dependency on an UPDATE RLS policy; question snapshots are only inserted on first result creation.
- Important remaining boundary: Cortex event emitters are not yet backed by a transactional outbox, and memory read/modify/write can still race across truly concurrent workers. This is not a blanket exactly-once guarantee for every downstream side effect. Older clients that omit `attemptId` continue on the legacy path.
- Migration application, schema/RLS verification, clean build, automated retry/concurrency tests, and real-device/airplane-mode tests remain outstanding. Vercel deployment checks have previously been blocked by the account's build-rate limit, not by a confirmed compiler error.


## 2026-11-12 implementation update: exam submission ledger verified in Supabase

- The `exam_submission_ledger` migration is now applied to the active Shadecode Student Supabase project. The deployed table has RLS enabled; authenticated users receive owner-filtered SELECT only, while the server-side service role has the table privileges needed by the RPCs.
- Both ledger RPCs now use `SECURITY INVOKER`, not `SECURITY DEFINER`. Execute is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted only to `service_role`.
- A rollback-only database verification exercised the initial claim, lease-token completion, completed-result replay, and payload-conflict paths. The test transaction was rolled back, leaving no verification attempt row behind.
- The live database confirms the `exam_results(user_id, attempt_id)` unique index exists.
- The API now claims an identified attempt before invoking potentially expensive AI/deterministic marking. Completed retries return the stored result without repeating marking work or downstream side effects.
- The client now retries the question-snapshot insert even when it finds an already-created result row. The snapshot table's `result_id` primary key makes the insert naturally idempotent; a duplicate-key response is treated as already persisted. This repairs the partial-write case where the result row succeeded but the question snapshot did not.
- Supabase security advisors show no new warning for the exam ledger table or its RPCs. Existing unrelated warnings remain elsewhere in the project (including other SECURITY DEFINER functions, RLS tables without policies, and Auth leaked-password protection).
- This verifies the database contract and SQL state, not a full application integration test. A deployed route retry test, concurrent request test, clean build, and browser/device test remain outstanding. Downstream Cortex event writes and memory read/modify/write are not yet a transactional outbox, so exactly-once semantics for every secondary effect are not claimed.


- Follow-up route correction: the submission claim now occurs before marking, so a completed retry can return its stored result without paying for AI marking again. The earlier source ordering had the claim after marking despite its comment; this is now corrected.
- Corrected the exam-to-Cortex call to pass the actual `score` and `maxScore` expected by `updateCortexFromExam` (the old call supplied a percentage-shaped argument and could fail validation). It now supplies a deterministic UUID derived from the student and attempt identity, allowing the durable `cortex_events` insert to deduplicate safely on retry. Removed the separate in-memory-only Cortex event emission from this server path.
- The question snapshot retry now attempts the insert every time. Its `result_id` primary key prevents duplicates while allowing recovery if a prior request saved the result row but failed before saving its question snapshot.
- GitHub Actions CI has been triggered by the latest push. At the time of this update it is queued; no passing build/typecheck/lint/test result is claimed yet.

- Additional privilege-path verification ran the claim, completion, and replay sequence under `SET LOCAL ROLE service_role` inside a transaction, then rolled it back. This confirms the exact role used by the server-side service client can execute the RPCs and write the ledger without granting function execution to browser roles.


## 2026-11-12 implementation update: atomic Cortex exam memory

- Added and applied `record_exam_score(uuid, jsonb)` in migration `20261112200000_atomic_cortex_exam_score.sql`.
- The exam-mark route no longer reads `cortex_memory.exam_scores` into application memory and writes the whole array back. It now calls the database RPC.
- The RPC performs an atomic `INSERT ... ON CONFLICT (user_id) DO UPDATE`. PostgreSQL serializes concurrent updates to the user's Cortex memory row, then the function removes any prior score with the same `submissionIdentity`, appends the latest score, and recomputes the average within the database statement.
- Execute is revoked from `PUBLIC`, `anon`, and `authenticated`; only `service_role` can call the RPC. The function uses invoker rights.
- Added `supabase/tests/atomic_cortex_exam_score.test.sql`. It was executed against the connected Supabase project successfully. It verifies that retrying the same submission identity leaves exactly one entry, replaces the prior score with the latest score, and returns an average. The test runs in a transaction and rolls back its writes.
- A separate privilege check confirmed service_role can execute the RPC while authenticated and anon cannot.
- Concurrency safety is provided by the database's unique-key upsert row lock, but a simultaneous multi-connection stress test has not yet been run. The SQL regression test currently covers retry/idempotency, not a real concurrent race.
- The exam event pipeline still has secondary handlers outside this atomic score-memory RPC. They are not yet moved into a transactional outbox, so the system does not claim exactly-once delivery for every analytics/recommendation side effect.


## 2026-11-12 implementation update: durable exam completion outbox

- Added and applied migration `20261112210000_exam_completion_outbox.sql`.
- `complete_exam_submission` now accepts the completion event payload and, in the same database transaction that marks the attempt completed, inserts one `exam_completion_outbox` row keyed by `(user_id, attempt_id)`. A committed exam result therefore cannot be separated from its pending durable completion event.
- Added service-role-only RPCs:
  - `claim_exam_completion_outbox`: claims pending jobs with `FOR UPDATE SKIP LOCKED`, rotates the lease token, and reclaims stale processing jobs.
  - `finish_exam_completion_outbox`: acknowledges completion or schedules retry with exponential backoff. Lease-token fencing prevents an expired worker from acknowledging a job claimed by a newer worker.
- The authenticated exam route now moves Cortex event persistence, Cortex exam-score memory, and the unified exam-completed event out of the synchronous request path for attempts with stable IDs. Those side effects are queued atomically with result finalization.
- Added protected worker endpoint `/api/internal/process-exam-outbox`. It validates the payload, writes the deterministic durable Cortex exam event, calls the atomic exam-score memory RPC, emits the unified exam-completed event, then acknowledges the outbox job. Failures are retried with backoff.
- Added GitHub Actions schedule `.github/workflows/process-exam-outbox.yml` (every 15 minutes) plus manual dispatch. **Operational setup remains required:** configure the same high-entropy `CRON_SECRET` as a GitHub Actions repository secret and as a Vercel environment variable, then redeploy. Until that secret is configured and the worker deployment is live, outbox rows remain safely pending.
- Legacy requests without a stable attempt ID retain synchronous side effects for compatibility; they do not receive the same transactional outbox guarantee.
- Added and executed `supabase/tests/exam_completion_outbox.test.sql` against the active Supabase project. It verifies result finalization enqueues one outbox job, failed jobs can be reclaimed, lease tokens rotate, and stale workers cannot acknowledge reclaimed work. The test transaction rolls back its writes.
- Verified RPC permissions: service_role can execute the outbox RPCs; authenticated users cannot read the outbox table or claim jobs.
- The event worker is idempotent for durable Cortex event IDs and exam-score submission identities. The unified in-process event pipeline still has non-durable handlers and is not yet a transactional event bus. This is not a claim of exactly-once delivery for every analytics or cache side effect.
- No full Next.js build, deployed endpoint test, real scheduled GitHub Actions execution, or end-to-end exam submission test has yet passed for this change.


- Follow-up hardening: added an explicit `service_role`-only ALL policy to the outbox table in migration `20261112220000_exam_completion_outbox_service_role_policy.sql`, then applied it. The outbox remains inaccessible to `anon` and `authenticated`.


## 2026-11-12 implementation update: durable topic-mastery projection

- Added and applied migration `20261112230000_atomic_exam_topic_mastery_projection.sql`.
- Added `exam_mastery_projection_ledger`, uniquely keyed by user, attempt, subject, and topic. It prevents an outbox retry from applying the same mastery observation twice.
- Added service-role-only RPC `project_exam_topic_mastery`. It serializes updates per student/subject/topic using a transaction-scoped advisory lock, locks existing mastery rows, applies the same 70/30 EMA mastery transition and richer learning-state updates, then writes the topic projection.
- The exam-mark route no longer updates `topic_mastery` synchronously. It calculates per-topic percentages and includes them in the completion event committed with the result.
- The outbox worker now projects each topic through the idempotent RPC before acknowledging the event. A retry after partial completion safely skips topics already recorded in the projection ledger and continues unfinished topics.
- Added and executed `supabase/tests/atomic_exam_topic_mastery_projection.test.sql` against the active Supabase project. It verifies first projection, duplicate-attempt suppression, and a second distinct attempt updating the EMA (60 then 100 yields 72) with attempt/exposure counters incremented once. Test transaction rolled back.
- Verified service_role can execute the RPC, authenticated cannot, and authenticated cannot read the projection ledger.
- Legacy exam requests without a stable attempt ID retain their compatibility synchronous event/memory path; they do not get the transactional mastery outbox guarantee.
- The outbox worker still emits the unified event pipeline after the durable Cortex and mastery projections. That pipeline's secondary analytics/cache handlers are not yet all independently durable or exactly-once.
- GitHub Actions runs for the latest commits were still in progress when checked. Vercel build/deployment remains unverified due the previously reported build-rate-limit failure. No full TypeScript build, application test suite, real concurrent stress test, or end-to-end deployed exam test has passed for this change.


## 2026-11-12 implementation update: durable exam analytics ingestion

- Added and applied migration `20261112240000_durable_exam_analytics_event.sql`.
- Added service-role-only RPC `record_exam_completion_analytics`. It writes a normalized `exam_completed` row to the existing `learning_events` table using the deterministic exam event UUID as the row ID. A replay with the same ID is acknowledged without creating a duplicate.
- The exam outbox worker now persists this analytics event after Cortex score memory and per-topic mastery projections, and before acknowledging the outbox job. Analytics persistence failure therefore requeues the job.
- Removed the worker's call to the in-process unified event pipeline. That pipeline's analytics handler is currently a logging TODO, its Cortex handler routes through a browser-local queue (no-op in a server process), and recommendation cache invalidation is process-local. Calling it from a cron worker did not provide durable downstream delivery.
- Added and executed `supabase/tests/durable_exam_analytics_event.test.sql`. It verified the first insert, duplicate replay suppression, event fields and attempt identity; the transaction rolled back.
- This makes exam analytics ingestion durable and idempotent. It does not yet make all analytics aggregations or recommendation-cache invalidation globally durable. Recommendation caches remain in-memory with bounded TTLs (10 minutes in the recommendation engine and 15 minutes in the student-intelligence engine); a cross-instance cache-version mechanism remains future work.
- Legacy exam requests without stable attempt IDs still use the compatibility synchronous path.
- GitHub Actions and Vercel checks for the newest commits must be checked before deployment claims. No full app build, deployed worker run, or end-to-end exam submission has been verified for this increment.


## 2026-11-12 implementation update: cross-instance recommendation cache invalidation

- Added and applied migration `20261112250000_durable_recommendation_cache_versions.sql`.
- Added `recommendation_cache_versions`, an owner-readable version row per student, plus a service-role-only invalidation event ledger.
- Added service-only RPC `invalidate_recommendation_cache(user_id,event_id)`. It atomically increments the student's cache generation once per deterministic exam event ID. Outbox retries return the existing generation instead of incrementing repeatedly.
- The exam outbox worker now bumps the durable generation after Cortex memory, mastery, and analytics persistence, before acknowledging the job.
- Both `RecommendationEngine` and `IntelligenceEngine` now read the shared generation before serving their process-local caches. Cache entries are accepted only when their stored generation matches the database. If the version cannot be read (for example, offline), the engines bypass the process-local cache and recompute rather than serving potentially stale recommendations; they do not cache the result while the version is unavailable.
- Added and executed `supabase/tests/durable_recommendation_cache_versions.test.sql`. It verifies first invalidation, duplicate event suppression, and increment for a distinct event. The transaction rolled back.
- This is cross-instance cache invalidation by version check, not a distributed cache. Existing process-local entries remain allocated until expiry or replacement, but they are no longer served after a version change. Version lookup adds a small database read before cache use.
- Other event types (lesson completion, quiz completion, study session finish) still rely on existing in-process invalidation unless their own durable event/outbox path calls the shared invalidation RPC. This increment specifically closes the exam-completion path.
- GitHub Actions and Vercel statuses must be checked for the latest commit. No full app build, browser integration test, offline test, or deployed exam workflow has been verified for this increment.


## 2026-11-13 implementation update: durable invalidation from learning events

- Added and applied migration `20261113200000_invalidate_recommendations_from_learning_events.sql`.
- Added an `AFTER INSERT` trigger on `public.cortex_events`. Relevant durable learning events now increment the student's shared recommendation-cache generation automatically, including lesson completion, quiz completion, exam completion, study-session finish, activity completion, question attempts, task completion, mistake review, project evidence, and project stage completion.
- The trigger uses the durable Cortex event UUID as its idempotency identity in `recommendation_cache_invalidation_events`. Replaying an already-persisted event cannot increment the generation again.
- The existing exam outbox's explicit invalidation RPC remains in place. If the Cortex event and outbox worker use the same event UUID, the shared invalidation ledger suppresses the second bump.
- Added `supabase/tests/invalidate_recommendations_from_learning_events.test.sql`; executed successfully against the active Supabase project. It verifies a quiz completion increments the version, duplicate event insertion does not increment it again, and a lesson-view event does not increment it. Test transaction rolled back.
- This trigger only sees events actually persisted in `cortex_events`. Learning activity that never reaches durable Cortex event storage is not magically covered. The direct quiz assessment endpoint still needs to be checked for a canonical event emission path; its own assessment persistence is separate from this trigger.
- The invalidation is now durable for all relevant event types that enter the Cortex event store, across application instances. Full app build, Vercel deployment, and end-to-end client event delivery remain unverified.
