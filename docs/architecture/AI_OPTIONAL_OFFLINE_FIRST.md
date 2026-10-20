# AI-Optional, Offline-First Product Contract

## Non-negotiable product rule

Shadecode Student must remain a useful learning-control system when every AI provider is unavailable, no API key is configured, the learner has no connection, or the device cannot run a browser-local model. AI is an optional accelerator and teaching assistant, never the foundation required to open, study, practice, calculate, revise, or retain progress.

"Works without AI" does not mean inventing content. Deterministic features must work normally; authored curriculum content must work offline when cached; and when verified teaching material is unavailable, the app must explain that boundary rather than fabricate a lesson.

## Capability layers

1. **Core deterministic product (must not call an AI provider):** navigation, account/session-independent UI shell, locally available curriculum browsing, search/filtering over cached records, notes and saved lessons, progress tracking, streak/XP calculations, task and timetable management, focus timer, calculators, formula/reference sheets, flashcards from saved material, answer input, deterministic math checks where supported, and offline access to previously saved work.
2. **Authored and cached learning content:** curriculum packs, hand-written lessons, past-paper metadata and locally cached paper assets. Must be searchable and usable without model initialization or provider credentials.
3. **Deterministic assessment:** scoring, marks, timers, answer navigation, attempt persistence, review of answers, and result calculations must be local and repeatable. Any generated question set is optional; cached/authored question sets are the fallback. Never silently replace a requested exam or challenge with a different paper.
4. **Optional AI enhancement:** novel lesson drafting, open-ended explanations, generated practice, adaptive feedback, and semantic synthesis. These features may degrade to a clearly labeled authored/local fallback. If no suitable fallback exists, show a useful, actionable limitation instead of an endless spinner.
5. **Optional browser-local model:** use only when supported and already available or after the learner explicitly chooses to download it. Do not force a large model download because an AI provider failed.

## Runtime and persistence rules

- Provider keys, network access, Supabase availability, and WebGPU must not be prerequisites for deterministic core features.
- A request must have bounded execution time and a visible state. Every lane must resolve to success, a usable fallback, or a clear failure with retry/cancel options. No infinite progress loops.
- Save progress locally first where the feature is safe to do so; synchronize when connectivity and authentication return. Clearly distinguish device-only data from server-synced data.
- Never label a device-only lesson or attempt as cloud-saved. Never discard a completed checkpoint because the next section or provider failed.
- Avoid silent background retries that repeat expensive work or hide a broken provider. Retry only bounded, idempotent operations and resume from saved checkpoints.
- Do not claim a topic is covered just because its name appears in a syllabus list. Verified lesson content, questions, and answer keys must have provenance and explicit coverage.
- Offline content must be versioned and invalidated safely; stale cached data may remain readable, but should not masquerade as current syllabus material.
- Core UI must not depend on an AI-generated icon, title, explanation, or response to render.

## Feature acceptance checklist

A feature is not complete until its deterministic path is tested independently of AI:

- [ ] With provider keys removed and all AI endpoints returning errors, core navigation and saved content still work.
- [ ] With the network disabled after loading the app, cached lessons, notes, tasks, timetable, focus, progress, and cached assessments remain usable.
- [ ] Restarting the browser restores locally saved progress and in-progress attempts.
- [ ] Reconnecting synchronizes pending data without creating duplicates or overwriting newer progress.
- [ ] AI-dependent actions show a bounded loading state, then use a suitable verified fallback or an honest failure message.
- [ ] A provider timeout, malformed response, quota error, or browser-local model failure cannot leave a permanent spinner or strand a checkpoint.
- [ ] Exam Sim never silently swaps papers, question order, or frozen challenge identity during recovery.
- [ ] Calculations, marks, timers, and progress totals are deterministic and covered by unit tests.
- [ ] Offline and AI-disabled flows have automated tests; manual smoke tests alone are not enough.

## Delivery strategy

Implement and test this contract in slices, beginning with lesson generation/recovery and Exam Sim because they have known failure reports. Then audit each module against the checklist. Do not describe the whole product as "fully offline" until the individual modules and their data dependencies have been verified. This document defines the target contract; it is not a claim that every item is already implemented.
