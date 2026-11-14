# Student Sovereignty: Phase 0 Repository Audit

**Audit date:** 12 November 2026  
**Repository:** `mahambatakunda2008-afk/shadecode-student`  
**Scope:** source inspection of the default branch. This is a static code/document audit, not a device test.  
**Tracking:** issue #573; foundation PR #575.

## Executive finding

Shadecode already has meaningful offline foundations, including a production service worker, route warm-up, IndexedDB mutation storage, a local-first record store, a sync transport, a browser-local WebLLM integration, and local theme preferences.

However, the current architecture is **offline-tolerant / partially local-first**, not yet a fully offline learning platform. Several core boundaries remain online-dependent, local-first integration is limited to a small set of entities, and local AI model availability is not guaranteed on first launch or on unsupported devices.

Student customization currently appears limited to existing settings such as light/dark theme and learning mode. There is no verified implementation of full dashboard widget control, navigation arrangement, typography/density controls, or workspace composition.

Cortex has both a deterministic placeholder-style compact response class and a WebGPU-backed local model implementation, but the main router shown in `src/lib/cortex/router.ts` defaults to TeacherAI/cloud execution unless explicitly constructed with `useCompactLocalModel: true`. That local compact class is not a substitute for a capable local tutor.

## 1. Offline delivery and app shell

### Verified
- `public/sw.js` implements service worker version v7.
- `src/components/ServiceWorkerRegistration.tsx` registers the worker in production and clears page/RSC caches on sign-out.
- `src/lib/offline/warmPolicy.ts` defines 13 core routes, including Dashboard, Learn, Practice exams, Past papers, Study Plan, Curriculum, Tasks, Timetable, Achievements and Settings.
- `src/components/offline/OfflineWarmup.tsx` requests route warm-up after sign-in, with a 12-hour interval and data-saver/2G guards.
- The worker caches selected HTML documents, exact-match RSC responses and static assets. It can fetch warmed routes and referenced build assets itself.
- `public/offline.html` provides a fallback page and links to cached routes.
- `docs/OFFLINE_ARCHITECTURE.md` documents these boundaries and calls for a real-phone airplane-mode test.

### Limits
- The worker deliberately does not intercept API requests, non-GET requests, cross-origin requests or requests with Authorization headers.
- Only core routes are warmed automatically. Other pages may only be available if visited online first.
- Warmed pages are server-rendered snapshots, not proof that their data mutations work offline.
- Lazy-loaded chunks may not be available until the feature has been exercised online.
- The worker is production-only.
- The offline fallback itself says an unsaved screen cannot open offline.

**Assessment:** app-shell continuity is partially implemented. Full offline feature workflows are not established.

## 2. Local persistence and synchronization

### Verified
- `src/lib/offline/mutationQueue.ts` stores queued mutations in IndexedDB (`shadecode-offline-mutations`), scoped by authenticated owner ID.
- The queue currently allows stores: `tasks`, `subjects`, `learn_lessons`, `projects`, `project_evidence`, and `project_milestones`.
- Retry metadata and bounded exponential backoff exist.
- `src/lib/offline/sync.ts` bridges local-first operations into the mutation queue and sends them to `/api/sync`.
- `src/lib/local-first/store.ts` provides local record/operation/conflict APIs, user-scoped reads, local mutations and lesson-progress helpers.
- `src/components/OfflineShell.tsx` surfaces pending and failed queue counts and offers manual retry.
- `docs/OFFLINE_SYNC_AUDIT.md` identifies the same key gap: infrastructure exists, but application-wide adoption is incomplete.

### Limits
- The sync transport maps only tasks, subjects and lesson progress to remote tables in the inspected implementation.
- The mutation queue's approved-store set is wider than the inspected sync table map; do not assume every approved queue store has a complete sync implementation.
- The existing local-first audit explicitly says repository code search did not find app-wide consumers of the local-first store at the time of that audit.
- The sync queue is not proof that every feature writes locally before contacting Supabase.
- XP, achievements, streaks, exam answers, exam finalization, notes and Cortex memory need individually verified local mutation and merge behavior.
- Existing audit guidance correctly warns against treating XP as client-overwritable state and against one universal last-write-wins policy.

**Assessment:** local-first primitives and a sync lane exist. Product-wide local-first integration, entity-specific reconciliation and end-to-end recovery are incomplete/unverified.

## 3. Cortex and local AI

### Verified
- `package.json` includes `@mlc-ai/web-llm`.
- `src/lib/cortex/localModel.ts` defines a Llama 3.2 1B quantized WebLLM model path, uses WebGPU capability checks, worker execution with main-thread fallback, and timeouts.
- `src/lib/cortex/compactLocalModel.ts` provides deterministic prompt-category responses without model weights or provider calls.
- `src/lib/cortex/router.ts` checks in-memory CortexMemory first, then defaults to TeacherAI. The compact local model is used only when `useCompactLocalModel: true`.
- `src/lib/cortex/teacher.ts` calls the shared AI runtime and returns a reconnect message when provider execution fails.
- `src/lib/cortex/memory.ts` is an in-memory array cache, limited to the running JavaScript process; it is not durable device memory.

### Limits
- WebGPU support is required for the inspected WebLLM path.
- The code dynamically loads WebLLM and initializes the model. The inspected source does not establish that model weights are bundled with the app or pre-downloaded before the student goes offline.
- Browser storage eviction, device capacity, model download size, model warm-up and Android WebView compatibility need real-device validation.
- The default Cortex router does not select the WebLLM model.
- CompactLocalModel produces generic scaffolding text, not subject-grounded answers. It must not be presented as equivalent to a capable local tutor.
- In-memory CortexMemory is lost on reload/close and is not the durable persistent student memory requested.

**Assessment:** a local model experiment and deterministic fallback exist. A reliable, pre-provisioned, offline AI tutoring capability is not yet verified.

## 4. Student UI control and customization

### Verified
- `src/contexts/ThemeContext.tsx` persists light/dark mode in localStorage.
- `src/app/layout.tsx` bootstraps theme before hydration.
- `src/app/(app)/settings/page.tsx` includes profile, appearance and settings sections.
- `src/components/settings/LearningModeCard.tsx` allows Classic/Cortex AI selection and explicitly says the choice is stored on this device for now.

### Limits
- The inspected theme model has only light/dark modes.
- No verified dashboard widget show/hide/reorder model was found in the inspected dashboard entry/settings files.
- No verified navigation reorder/visibility editor was found.
- No verified typography, density, spacing or custom workspace-layout preference schema was found.
- Local-only preference storage needs an explicit policy for export/import, account switching, device sync and reset.

**Assessment:** basic appearance/mode preferences exist. Full student-controlled UI customization is not yet established.

## 5. Handwriting and subject tools

The Phase 0 sample did not establish that handwriting OCR/recognition runs fully on-device. This requires a targeted code-path audit of the handwriting checker, its model/runtime assets and network requests.

Likewise, individual calculators, graphing, diagram tools and examination interfaces need feature-by-feature offline tests. Do not infer offline support from the service worker caching their route.

## 6. Client/platform coverage

- Web/PWA: a service worker and browser IndexedDB mechanisms are present.
- Android: a signed release workflow/artifact has existed, but this source inspection did not establish native Room storage or parity of offline workflows in the Android package. Verify the current Android wrapper/runtime and device behavior separately.
- Desktop: prior work established a Tauri shell foundation, but that is not evidence of a complete offline desktop workspace.

## 7. Priority gap register

| Priority | Gap | Evidence needed / next task |
|---|---|---|
| P0 | Actual offline workflows by feature | Build a route × operation × client matrix; test cold start, force-close, airplane mode and reconnect. |
| P0 | Local-first integration coverage | Trace read/write paths for notes, tasks, timetable, lessons, exam sessions/answers, progress, XP, achievements and Cortex memory. |
| P0 | API and auth dependencies | Identify all startup/auth/profile/content API calls and define offline session behavior securely. |
| P1 | Durable learner memory | Replace process-only interaction cache for approved durable preferences/context with a user-scoped, versioned local store and safe sync. |
| P1 | Student UI preferences | Define typed schema for widgets, navigation, theme, typography, density, workspace, notifications and accessibility. |
| P1 | Local AI provisioning | Establish supported device matrix, model download/size, integrity, storage, offline initialization and fallback behavior. |
| P1 | Handwriting OCR | Verify local model/runtime, downloaded assets, offline accuracy and low-resource fallback. |
| P2 | Cross-client parity | Validate PWA, Android and desktop separately; do not assume browser IndexedDB equals native durable storage. |
| P2 | Conflict and recovery | Verify per-entity conflict policy, account switching, sign-out cleanup, backup restore and sync retries. |

## 8. Recommended next implementation slice

Do not start by replacing the service worker or inventing a second storage layer.

The safest next slice is a **Local-First Adoption Matrix**:
1. Enumerate each learner-facing feature and its read/write operations.
2. Trace each operation to local storage, queue, remote API and conflict handler.
3. Mark the operation as offline-ready, download-required, online-only or unverified.
4. Add tests around the actual local write and reload/force-close behavior.
5. Select one low-risk, high-value feature for complete local-first integration, then repeat by entity.

In parallel, create a typed, versioned Student Experience Preferences model. Keep the UI editor as a separate deliverable from the storage contract.

## Release truth

At this audit point, Shadecode should be described as having **offline support for selected cached screens and selected queued data mutations**, not as fully offline. Full local AI, handwriting recognition, broad student UI customization and application-wide local-first behavior remain unverified or incomplete.

No real-device airplane-mode test was run as part of this static audit.
