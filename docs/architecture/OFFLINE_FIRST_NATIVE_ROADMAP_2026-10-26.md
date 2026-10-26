# Shadecode Student: Offline-first and native product plan
**Status date:** 2026-10-26

## Product promise

Shadecode must remain useful when a learner has weak, expensive, intermittent, or zero connectivity. Offline is a product capability, not a badge that means only the homepage opens.

Do not advertise "works fully offline" until the exact offline workflows below are tested on a real low-end Android device.

## Current verified architecture

- The web client is Next.js. Its service worker is intentionally disabled in `next.config.ts` while the previous worker lifecycle is rebuilt safely. Therefore the web app must not currently be described as fully offline-capable.
- The Android client is Kotlin + Jetpack Compose. It does not use a WebView.
- Android already has Room entities for subjects, lessons, lesson progress and pending sync; DataStore stores the session; WorkManager handles queued progress sync; native Cortex/local-runtime components exist.
- The first Android sign-in still requires connectivity. Cloud AI, server refreshes and cross-device synchronization require connectivity.
- Android has only a subset of the web product today. A native shell is not equivalent to complete native feature parity.
- There is no complete iOS SwiftUI client yet.

## Offline tiers and acceptance criteria

### Tier 1: Start and resume offline
- After a successful online sign-in, app starts without a connection using the last saved session/profile and cached subjects.
- Clearly show offline/last-synced state without blocking cached screens.
- Expired sessions must not erase local learning data. Reauthentication is required only for protected server operations.

### Tier 2: Study offline
- Learners can open lessons that were previously synced/downloaded, read all supported block types, continue progress, and use available local practice.
- A lesson's content and progress survive process death and device restart.
- Local progress is stored immediately, independently of the network.
- A durable outbox queues progress changes and retries with backoff after connectivity returns.
- Empty or temporarily incomplete server responses must never wipe a non-empty local cache.

### Tier 3: Intentional downloads
- Add "Download for offline" at subject/course level with estimated size, progress, cancellation, storage management and last-updated date.
- Download only the learner's permitted curriculum and content. No cross-user private records in shared caches.
- Include diagrams, formulae, images and required assets, not only lesson text.
- Remove outdated content only after a replacement has been downloaded and verified.

### Tier 4: Web offline support
- Rebuild a safe service-worker lifecycle before enabling it. Do not cache authenticated API responses, user-specific HTML/RSC responses, or secrets in a shared cache.
- Provide an offline shell and explicit offline-ready lesson storage.
- Use a versioned cache, bounded storage, update notifications, safe activation and tests for login/logout/account switching.
- Never make a network-dependent route appear functional merely because its HTML shell is cached.

### Tier 5: Complete native clients
- **Android:** Kotlin + Jetpack Compose, Room, DataStore, WorkManager, platform file/download APIs, native navigation and accessible system integration.
- **iOS:** SwiftUI, SwiftData/Core Data, Keychain, background task/sync APIs and native navigation.
- Share API contracts, curriculum identifiers, learning-asset schemas, sync semantics and tests, not UI/WebView code.
- Keep the web product as a first-class web app. Native apps are independent clients, not wrappers.
- Establish feature parity through a screen-by-screen capability matrix. Do not claim complete native status while Learn, exam simulation, Math Checker, timetable, focus, projects and account/privacy flows remain absent or partial in native clients.

## Implementation sequence

1. Protect existing offline data from empty server responses and restore cached learner context before network refresh.
2. Test and harden the Android Room/outbox sync lifecycle, including expired sessions, duplicate retries, conflicting progress and process death.
3. Add deliberate lesson/course downloads and a visible offline indicator.
4. Define shared API/content contracts and a web offline safety design; only then re-enable a service worker.
5. Build the Android feature-parity matrix and implement high-value native learning workflows.
6. Start the iOS SwiftUI client against the same contracts.
7. Test airplane mode, flaky connections, low storage, app upgrades, account switching and real low-end devices before publishing the offline promise.

## Work committed in this pass

- Android now restores the last cached learner profile before attempting a network refresh.
- Android no longer clears the cached subject list when the server returns an empty subject response.
- Android documentation now correctly describes the client as native Compose rather than a WebView shell and states the current offline limitations.

These are targeted reliability improvements, not a claim that the entire product is already offline or feature-complete natively.
