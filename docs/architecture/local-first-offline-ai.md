# Shadecode Student: Local-First + Offline AI

## Product rule

Shadecode Student must be useful after the first successful app load even when the network disappears. Offline is not an error state. It is a supported operating mode.

## Layers

1. **App shell**: service worker/PWA assets cached so authenticated learners can reopen the application without requesting the landing page or remote navigation.
2. **Local data**: IndexedDB is the source of truth for learner-owned mutable state while offline. This includes projects, evidence, milestones, tasks, timetable data, study progress and other explicitly supported stores.
3. **Mutation queue**: local writes are durable and queued. Sync is retryable, owner-scoped and idempotent.
4. **Cloud sync**: Supabase provides durable cross-device storage when connected. It is not required for the local UI to render or for local work to continue.
5. **AI runtime**: an offline provider interface allows an on-device model runtime to supply tutoring, project coaching, planning, question generation and summarization. Cloud models are enhancement/fallback paths, not the only way to make the product intelligent.
6. **Cortex**: routes requests between local deterministic intelligence, offline model capabilities and online providers according to capability, availability, privacy and cost.

## Offline guarantees

- Launch the installed PWA while disconnected.
- Restore the authenticated app shell without waiting on a network request.
- Open cached/local learner data.
- Create and edit learner-owned records offline.
- Queue writes without blocking the UI.
- Retry synchronization when connectivity returns.
- Clearly distinguish local/unconfirmed cloud state from synchronized state.
- Never fabricate project evidence because an AI provider is unavailable.

## Offline AI strategy

The first release should not pretend that every device can run a large model. Instead, expose one provider contract and capability detection. Ship a small, quantized on-device model where device/browser support is sufficient, with deterministic fallback for capabilities that do not require generation. The provider can later target WebGPU/WASM on capable browsers and native/mobile runtimes in packaged builds.

High-value first offline capabilities:

- explain a concept from cached curriculum content;
- quiz/question generation from cached curriculum;
- project-stage coaching using local project context;
- study-plan adjustments from local tasks/timetable;
- summarization of locally stored notes.

Online models can provide richer generation when available, but the UI must not make the network a hidden prerequisite.

## Sync conflict rule

Every local mutation must carry an owner and timestamps/version metadata. Prefer deterministic last-write-wins for simple records and explicit conflict review for project evidence where silently replacing learner work would be dangerous. Never delete local learner work merely because a sync request fails.

## Security

Only authenticated user-scoped records may enter the generic mutation queue. RLS remains mandatory for cloud persistence. Offline caches must never be treated as proof of authorization for another user.
