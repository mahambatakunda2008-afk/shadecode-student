# Local-First Adoption Matrix

**Audit date:** 16 November 2026  
**Repository:** `mahambatakunda2008-afk/shadecode-student`  
**Base:** `main`  
**Scope:** source-level trace of learner-facing local reads, local writes, queued delivery, remote synchronization and conflict handling.  
**Status:** implementation inventory, not a claim of device-tested offline readiness.

## Executive finding

Shadecode has several distinct local-first mechanisms. They must be treated as separate, cooperating systems rather than replaced with a new universal store:

1. **PWA app-shell cache** — warms selected routes and assets. It does not make API-backed interactions offline.
2. **LocalFirstDB** — IndexedDB records, operations, conflicts and per-device Lamport/sequence metadata.
3. **Offline mutation queue** — a separate IndexedDB outbox for selected remote mutations.
4. **Canonical learning-event outbox** — a separate event-delivery lane for Cortex evidence, with its own persistence/projection completion rules.
5. **Feature-specific local stores/caches** — for example task/subject/progress helpers and selected tutorial content.
6. **Local preferences** — currently includes device-local theme and learning-mode settings.

The central gap is adoption and integration. The existence of a local entity type, IndexedDB store, warmed route, or queue entry is not evidence that a complete feature workflow works offline.

**Release language:** current evidence supports selected cached screens, selected local-first records and selected queued writes. It does not support describing the complete Student experience as offline-ready.

## 1. Verified infrastructure boundaries

| Layer | Source | Verified behavior | Boundary |
|---|---|---|---|
| PWA shell | `public/sw.js`, `src/lib/offline/warmPolicy.ts`, `src/components/ServiceWorkerRegistration.tsx` | Versioned service worker; 13 core routes; quiet warm-up with data-saver/2G guards; static assets and selected HTML/RSC caching. | No API interception, no general write interception, no proof of live data or feature workflow availability. |
| Mutation outbox | `src/lib/offline/mutationQueue.ts` | IndexedDB queue; authenticated owner ID required; bounded retries/backoff; retry/failure status; owner-scoped removal. | Approved stores are wider than the server sync allowlist and the local-operation bridge. |
| Local record database | `src/lib/local-first/db.ts`, `src/lib/local-first/store.ts` | IndexedDB records, operations, conflicts, metadata; per-user record reads; atomic local record + operation mutation; per-device sequence and Lamport clock. | A primitive is not a feature integration. Every consumer still needs tracing and lifecycle tests. |
| Sync coordinator | `src/lib/offline/sync.ts` | Online event + 30-second sync loop; local-operation bridge; authenticated queue delivery; server conflict fetch/reconcile path; task/subject/progress helpers. | Current remote mapping and local-operation bridge support only tasks, subjects and lesson progress. |
| Sync API | `src/app/api/sync/route.ts` | Authenticated user required; accepts only tasks, subjects and learn_lessons; validates payload owner; delegates revision checks to `apply_sync_mutation`. | No server route support for projects, evidence or milestones in the inspected allowlist. |
| Canonical learning events | `src/app/api/intelligence/events/route.ts`, `src/lib/intelligence/learningEvents.ts`, `docs/architecture/canonical-learning-events.md` | Authenticated, normalized, deterministic event identity; durable idempotent persistence; projection completion is distinguished from persistence-only 202 responses; dedicated offline delivery queues are documented. | Do not route these events through the generic mutation queue or let client marks become authoritative. |
| Cortex memory | `src/lib/cortex/memory.ts`, `src/lib/cortex/router.ts` | A process-local question/answer cache exists; a separate `cortex_memory` Supabase row stores selected learner aggregates. | Process cache is lost on restart; Supabase-backed memory reads/writes remain network-dependent in this client module. Not a durable offline learner-memory implementation. |
| Preferences | `src/contexts/ThemeContext.tsx`, `src/components/settings/LearningModeCard.tsx` | Theme persists in localStorage; learning mode is explicitly device-local. | No verified versioned preference schema, account-aware sync, export/import/reset contract or full workspace customization. |
| Platform parity | Android and Tauri/desktop foundations | Platform work exists in repository history. | This source trace does not establish native durable-store parity or complete airplane-mode workflows on Android/desktop. |

## 2. Feature × operation × client matrix

Availability labels:
- **Offline-ready:** complete operation has been verified in airplane mode.
- **Download required:** complete operation is expected to work after an explicit download.
- **Online-only:** operation requires a live remote service.
- **Unverified:** source or device evidence is insufficient.
- **Partial:** a local primitive exists, but the complete user workflow is not established.

| Feature / data | Read path | Create / edit path | Queue / remote path | Conflict / recovery | Web/PWA assessment | Android / desktop |
|---|---|---|---|---|---|---|
| App shell / core routes | Service-worker cache for 13 configured routes and selected assets. | Not applicable. | Warm-up fetches routes while online. | Cache versioning and offline fallback exist. | **Partial:** route snapshots only. | **Unverified** |
| Tasks | `TasksLocalFirstV2` loads local subjects/tasks first, then refreshes Supabase when online. | UI creates, completes and deletes through `localSubjects` / `localTasks`, which write to LocalFirstDB and append operations. | `tasks` and `subjects` are supported by queue, bridge, API and remote map; reconnect triggers `offlineSync.syncAll()`. | Revision-aware sync and conflict record/reconciliation exist; pending local operations are protected from server hydration. | **Strong partial:** create/complete/delete are device-first in this component; force-close, full reconnect and concurrent-edit tests remain. | **Unverified** |
| Subjects | `offlineSync.getSubjects` checks local subject store, then fetches Supabase and hydrates. | Local-first subject primitives exist. | `subjects` is supported by queue, bridge, API and remote map. | Revision-aware sync exists. | **Partial:** configuration read path exists; full subject lifecycle and offline enrolment/eligibility behavior not proven. | **Unverified** |
| Lesson progress | Local progress lookup; online hydration from `learn_lessons`. | Local-first progress record/operation helpers exist. | `learn_lessons` is supported by queue, bridge and API. Canonical lesson-completion evidence also has a database compatibility bridge. | Revision-aware progress sync; canonical evidence has independent idempotency. | **Partial:** progress primitives exist; lesson content availability and all lesson actions are separate questions. | **Unverified** |
| Lesson content | `offlineStorage.getLesson` / `getAllLessons` read downloaded lesson records from IndexedDB; selected tutorial content/assets have separate caching in prior work. | `offlineStorage.saveLesson` persists a lesson record locally. | No general content-pack registry/manifest or complete sync contract established in inspected files. | Content version and stale-pack behavior not established here. | **Download required:** a downloaded lesson record can be read locally; full lesson workflow still needs tests. | **Unverified** |
| Notes | `offlineStorage.getNotes(lessonId)` reads an IndexedDB notes record. | `offlineStorage.saveNotes` stores notes locally, keyed only by `lessonId`. | No notes mapping in generic sync allowlist and no remote sync path established here. | No notes-specific merge policy verified. The store key has no owner ID; if these records contain private learner notes, account-switch isolation is not established and must be fixed before claiming safe multi-account support. | **Partial / Unverified:** local persistence primitive exists, app call sites and ownership need audit. | **Unverified** |
| Timetable / study plan | Route is warmed; `timetable` and `goal` exist as LocalEntity types. | Feature-specific consumer and local write path not yet established. | No timetable/goal mapping in generic sync allowlist. | No entity-specific conflict policy verified. | **Unverified** | **Unverified** |
| Exam sessions / answers | Exam routes are warmed; local entity types include `exam_attempt`, `exam_result`, `exam_submission`. | Local entity type alone does not prove local writes, timer durability or answer autosave. | No exam entity mapping in generic sync allowlist. | Force-close recovery, timer reconciliation and submission idempotency require targeted audit. | **Unverified** | **Unverified** |
| XP / streaks / achievements | Local-first helpers read XP/streak/achievement records; achievement route is warmed. | `src/lib/local-first/gamification.ts` writes XP, streak and achievement records into LocalFirstDB. Tasks UI awards XP and records a study day after completion. | No generic sync mapping for these entities. Tasks UI also reads server profile XP during online refresh, so local offline rewards need a deliberate reconciliation path rather than silent overwrite. XP must not become client-overwritable authoritative state. | XP helper supports a bounded optional idempotency-key list, but the inspected Tasks completion call does not pass a key. No server-authoritative reconciliation contract verified. | **Partial:** local gamification writes exist; durable cross-device reconciliation and duplicate-safe reward application remain unverified. | **Unverified** |
| Project records | LocalEntity model and local operation primitives include room for project-like records. | Mutation queue allows `projects`, `project_evidence`, `project_milestones`. | **Mismatch:** `sync.ts` maps only task, subject and progress local operations; `/api/sync` allows only tasks, subjects and learn_lessons. Project queue entries therefore have no supported end-to-end sync path through this generic coordinator/API. | Project-specific sync and conflict semantics must be audited separately; do not silently retry unsupported stores. | **Blocked / Unverified** for generic queued sync | **Unverified** |
| Cortex Verify evidence | Dedicated compact local learner cache and event outbox are described in canonical event architecture. | Scored events are compacted; raw answers/images are excluded from the shared event payload. | Dedicated canonical event endpoint, not generic `/api/sync`. | Events remain queued until persistence and projection are confirmed; idempotent replay is expected. | **Partial:** documented architecture; full airplane-mode integration tests still required. | Android has separate local OCR foundations; shared parity **Unverified** |
| Cortex prompt memory | Process-local `CortexMemory` cache; separate Supabase `cortex_memory` aggregate row. | Process cache saves prompt/answer; Supabase memory update is remote. | No confirmed durable local-first user-memory store or generic sync adapter. | Process restart loses cache; cross-device reconciliation policy not established. | **Partial / Online-dependent** | **Unverified** |
| Theme / learning mode | Theme reads localStorage; learning mode choice is device-local. | User changes are stored locally. | No verified preference sync. | Account switching, export/import and reset behavior require tests. | **Partial / local-only** | **Unverified** |
| Student workspace customization | No verified widget/navigation/layout preference model found in the audited settings/dashboard sources. | No verified editor for widget order, navigation order, typography, density or workspace panels. | No preference sync contract. | Eligibility/role boundaries and deterministic reset not yet specified in code. | **Unverified** | **Unverified** |
| Lesson quizzes | `offlineStorage.getQuiz(lessonId)` reads a downloaded quiz record from IndexedDB. | `offlineStorage.saveQuiz` stores quiz questions and correct answers locally. | No quiz-result sync mapping established in this source pass. | Quiz result ownership, marking provenance and result sync need separate verification; cached answer keys must remain content-authorized and must not become authoritative mastery evidence merely because they are local. | **Download required / Unverified** | **Unverified** |
| Curriculum / papers | Curriculum and Exam Hub routes are warmed; individual papers/resources may have separate downloads. | Download workflow and durable pack registration need a dedicated audit. | No single verified content manifest/version/hash pipeline in this source pass. | Version changes, revoked/updated files and storage quota handling need definition. | **Download required / Unverified** per resource | **Unverified** |

## 3. Concrete implementation mismatches and risks

### 3.1 Mutation queue allowlist is wider than the actual sync contract

`USER_SCOPED_MUTATION_STORES` currently allows:

- `tasks`
- `subjects`
- `learn_lessons`
- `projects`
- `project_evidence`
- `project_milestones`

But:
- `src/lib/offline/sync.ts` maps only `tasks`, `subjects`, `learn_lessons` to remote tables and maps only task, subject and progress local entities into mutations.
- `src/app/api/sync/route.ts` accepts only `tasks`, `subjects`, `learn_lessons`.

This is a contract mismatch. A project mutation may be accepted into IndexedDB but is not supported by the inspected local-operation bridge/API route. Do not expand the API allowlist blindly: first inspect Project Studio's own persistence and authorization contracts, then either connect its intended sync route or remove the misleading generic queue eligibility. Add a test that every queue-approved store has a complete transport mapping or is explicitly marked as feature-specific/non-drainable.

### 3.2 Generic queue and canonical learning-event outbox must remain separate

The canonical learning event route has stricter semantics:
- authenticated user identity is server-derived;
- source-event identity is deterministic and replay-safe;
- client-supplied correctness/marks are not authoritative;
- persistence and mastery projection completion are distinct;
- a projection-pending response must remain in its dedicated outbox.

Do not merge learning evidence into the generic CRUD mutation queue. Keep event provenance, evidence validation and projection retry semantics intact.

### 3.3 Local-first conflict policy is not one-size-fits-all

The existing revision-aware task/subject/progress sync is not permission to apply last-write-wins to every entity. In particular:
- XP, mastery and achievements must preserve server-authoritative derivation.
- Exam answers need attempt-scoped ordering, durable autosave, timer rules and finalization idempotency.
- Notes may use per-record causal/version conflict resolution, but the current offline notes store is keyed only by lesson ID and requires an ownership review before multi-account use.
- Timetable edits may need field-level merge or explicit user resolution.
- Downloaded curriculum resources need immutable version identities and safe replacement rules.

### 3.4 Existing offline storage has owner-scope and compatibility edges

- `src/lib/offline/storage.ts`
- `src/lib/local-first/tasks.ts`
- `src/lib/local-first/subjects.ts`
- `src/lib/local-first/gamification.ts`
- `src/components/tasks/TasksLocalFirstV2.tsx` contains IndexedDB stores for lessons, notes and quizzes. The `notes` store is keyed only by `lessonId`, and `OfflineNotes` has no `userId`; if this stores private learner-authored notes, account-switch isolation is not established. Audit all call sites before using it as a private notes store.
- `offlineStorage.getUnsyncedProgress()` currently calls `listPendingProgress("")`, while `listPendingProgress` returns an empty list for a missing user ID. Callers must use `getUnsyncedProgressForUser(userId)`; audit and remove or repair any legacy use.
- The Tasks UI awards local XP and records local study days, but the generic sync bridge does not map `xp` or `streak`. Online profile refresh can then display server XP. A server-authoritative, idempotent reward reconciliation design is needed; do not simply add XP to the generic CRUD sync allowlist.

### 3.5 Local storage lifecycle is part of correctness

Acceptance tests must include:
- account A signs out and account B signs in on the same device;
- local reads never expose A's records to B;
- pending mutations remain owner-scoped and are not submitted as B;
- logout/account deletion cleanup follows the existing privacy contract;
- browser storage eviction and quota errors are surfaced honestly;
- force-close/restart does not lose acknowledged local work;
- sync conflict remains visible and recoverable.

## 4. Student Experience Preferences: versioned contract proposal

This is a schema contract only. It does not add a second user profile or implement a UI editor.

Recommended shape:

```ts
type StudentExperiencePreferences = {
  schemaVersion: 1;
  updatedAt: string;
  appearance: {
    theme: "system" | "light" | "dark";
    accent: "shadecode" | "blue" | "green" | "purple" | "orange";
    fontScale: "small" | "default" | "large" | "extra-large";
    density: "comfortable" | "compact";
    reduceMotion: boolean;
    highContrast: boolean;
  };
  dashboard: {
    widgetOrder: string[];
    hiddenWidgetIds: string[];
    widgetConfig: Record<string, Record<string, string | number | boolean>>;
  };
  navigation: {
    itemOrder: string[];
    hiddenItemIds: string[];
  };
  workspace: {
    layout: "focused" | "balanced" | "wide";
    visiblePanels: string[];
  };
  notifications: {
    enabledCategories: string[];
    quietHours?: { start: string; end: string };
  };
  accessibility: {
    keyboardHints: boolean;
    captions: boolean;
    screenReaderOptimizations: boolean;
  };
};
```

Implementation rules:
1. Validate every imported or synchronized object at runtime; TypeScript alone is not validation.
2. Unknown widget/navigation IDs are ignored, not rendered. The server remains authoritative for eligibility, role and subject access.
3. Never let preferences change permissions, curriculum enrolment, privacy or safety controls.
4. Migrate older versions deterministically; reject malformed future versions without destroying the last valid local copy.
5. Persist locally first. Sync only after authentication, with an explicit conflict policy and no dependency on network for applying the local preference.
6. Provide export, import, reset-to-default and account-switch behavior.
7. Keep theme and learning-mode compatibility until existing consumers migrate; do not create two competing preference sources.
8. Preferences are user-owned configuration, not learning evidence and not Cortex mastery data.

## 5. Recommended implementation order

### Slice 1 — Close the queue/sync contract gap
- Add a contract test asserting every generic queue-approved store is supported by the local bridge and server route, or explicitly excluded with a reason.
- Audit Project Studio's actual persistence path before changing project queue behavior.
- Ensure unsupported queued stores fail visibly and are not silently counted as retryable network failures.

### Slice 2 — Finish one complete local-first feature
Use **Tasks** as the first candidate because the current source already has local reads/writes, a real UI consumer, queue delivery, authenticated API and revision-aware conflict handling. Include the XP side-effect in the same acceptance scope, but keep XP reconciliation separate from generic task CRUD.
- Trace every Tasks UI call site.
- Verify create, read, update, complete, delete, reload and force-close behavior.
- Test airplane-mode mutation, reconnect, duplicate replay and conflict recovery.
- Test account switching and ownership isolation.
- Only then mark Tasks offline-ready.

### Slice 3 — Apply the proven pattern by entity
- Subjects and lesson progress, with their distinct ownership and evidence constraints.
- Timetable and study plan, with an explicit merge policy.
- Notes, with local-first storage and export/recovery.
- Exam sessions and answers, with attempt-specific autosave, timer and finalization rules.
- Project Studio through its intended persistence boundary.
- XP/achievements only through authoritative event/state projection.

### Slice 4 — Student preferences
- Add the runtime-validated versioned model and migration tests.
- Migrate existing theme and learning-mode settings without breaking device-local behavior.
- Add editor and export/import/reset only after the storage contract is stable.

### Slice 5 — Platform acceptance
Run separate airplane-mode suites for Web/PWA, Android and desktop. A passing browser test does not establish native parity.

## 6. Acceptance test checklist

- [ ] Cold start after app and required content have been installed/downloaded.
- [ ] Open a previously downloaded lesson and paper in airplane mode.
- [ ] Create/edit/delete a task offline; close/reopen app; verify local state.
- [ ] Reconnect; verify exactly-once server effect and queue removal only after acknowledgement.
- [ ] Force a concurrent edit; verify deterministic conflict capture and visible resolution.
- [ ] Switch accounts on one device; prove no cross-account local reads or writes.
- [ ] Verify failed/unsupported mutations are not misreported as temporary connectivity failures.
- [ ] Verify event outbox retries independently and does not duplicate canonical evidence.
- [ ] Verify exam timer/answers survive force-close and reconnect without premature submission.
- [ ] Verify preferences apply offline, migrate, export/import and reset safely.
- [ ] Repeat on supported Android and desktop builds.
- [ ] Record device/browser/OS, app build, content-pack version, test steps and result.

## 7. Evidence references

Source files inspected on `main`:
- `src/lib/offline/mutationQueue.ts`
- `src/lib/offline/sync.ts`
- `src/app/api/sync/route.ts`
- `src/lib/local-first/db.ts`
- `src/lib/local-first/store.ts`
- `src/lib/local-first/types.ts`
- `src/lib/offline/storage.ts`
- `src/lib/offline/warmPolicy.ts`
- `src/lib/cortex/memory.ts`
- `src/lib/cortex/router.ts`
- `src/contexts/ThemeContext.tsx`
- `src/components/settings/LearningModeCard.tsx`
- `src/app/api/intelligence/events/route.ts`
- `src/lib/intelligence/learningEvents.ts`
- `docs/architecture/canonical-learning-events.md`

This document records source-level observations. Device behavior, all feature call sites, project-specific persistence, native storage, and full airplane-mode acceptance remain open verification work.
