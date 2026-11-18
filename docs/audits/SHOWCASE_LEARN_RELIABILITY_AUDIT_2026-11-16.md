# Showcase Learn Reliability Audit — 16 November 2026

**Scope:** Static source inspection of the current `main` branch for the Learn generation, durable checkpoint, finalization, and local-save paths. This is not an authenticated browser/device acceptance test.

## Executive result

The current code has meaningful reliability safeguards. It is not accurate to describe Learn as having no recovery path. The inspected production source includes authenticated subject resolution, bounded learner-memory enrichment, resumable section generation, server-owned lease/checkpoint handling, curated provider-free recovery for exact matching topics, server-side lesson validation, and an explicit device-only save path when cloud persistence fails.

However, this source inspection does **not** prove that a learner can complete the workflow without getting stuck, that the UI communicates device-only status clearly, or that the result reliably reopens after refresh/force-close. Those are the decisive showcase acceptance tests.

## Source observations

### 1. Request and learner boundary

In `src/app/api/learn/route.ts`:

- The route authenticates the bearer token or server session before serving learner data.
- Lesson generation resolves the requested subject through `resolveLearnerSubject`; the route does not simply trust an arbitrary subject name.
- Request validation and the AI endpoint rate limiter run before generation.
- Learner memory enrichment is best-effort and bounded to approximately 900 ms. A slow memory read is not intended to consume the model-generation budget.
- Supplied ShadeNet research context is bounded and explicitly labelled unverified reference material, with instructions not to treat it as authority or instructions.

### 2. Resumable generation

The inspected source uses a durable generation job and a lease:

- Section mode requires a valid generation job ID and lease ID.
- The server claims the lease and reads the server checkpoint. It uses the durable completed-unit count and stored partial blocks rather than trusting a stale browser's section index or prior blocks.
- A durable lesson draft is created before the first section response, avoiding a create-job/create-draft race.
- Provider calls are bounded and section repair is limited.
- If provider execution or section repair is exhausted, the route tries an exact subject/topic curated fallback. If none matches, it returns an explicit retryable/provider-unavailable response and preserves the request/checkpoint rather than inventing a lesson.

### 3. Finalization and persistence

For the `persist` mode:

- The server validates the generated payload and applies lesson-quality checks.
- When a durable job/lease is supplied, the route verifies the active lease and uses `checkpoint_cortex_generation` to atomically finalize the job and lesson.
- The persisted lesson starts at learner progress 0. Generation completion is not confused with the learner having completed the lesson.
- If no durable job is supplied, a separate authenticated insert path exists. The ordinary client generation flow should be checked to ensure it always uses the durable job path.

### 4. Cloud-save failure

In `src/lib/cortex/lessonGenerationClient.ts`:

- A failed cloud persistence response does not discard a valid generated lesson.
- The client stores it in IndexedDB and leaves `lastSyncedAt` unset, explicitly distinguishing device-only storage from confirmed cloud persistence.
- The local result is opened for the learner, rather than silently discarded.

**Showcase risk to verify:** the generation job is represented locally as complete (100%) even when the lesson is only device-local. That can be correct for generation progress, but the actual learner-facing UI must clearly distinguish “generated and saved on this device” from “saved to account/cloud”. Confirm the badge/message survives navigation, reload and account changes. Do not call a device-only save a synced or cloud-saved lesson.

## What is not established by source inspection

The following remain unverified and must be tested with a dedicated demo account on the actual presentation device:

1. Generate a supported lesson successfully and inspect the content for subject/topic accuracy.
2. Navigate away, return, refresh and reopen the lesson.
3. Repeat the same flow at least three times without duplicate lessons, lost work or confusing state.
4. Simulate provider exhaustion and verify exact curated fallback selection and its origin label.
5. Interrupt generation mid-section, reload, resume and confirm the server checkpoint is authoritative.
6. Interrupt cloud persistence and verify device-only save messaging and reopen behavior.
7. Switch from account A to account B on the same browser/device and verify no local lesson or pending generation leaks across accounts.
8. Verify the local-only lesson is not falsely represented as synced or cross-device available.
9. Verify the exact lesson/subject shown is allowed by the learner's selected subjects and matches the stated board/level.
10. Verify the chosen demo workflow on the network conditions and display hardware expected at the event.

## Recommended showcase decision

Do not make AI lesson generation the primary live demo until the above tests pass. Prefer a deterministic, already-populated learning or assessment flow that can be repeated without a provider dependency. Keep Learn generation as a secondary demonstration only after the persistence/reopen and recovery checks pass.

If the final selected flow is not Learn generation, retain Learn as an engineering verification workstream rather than forcing it into the presentation.

## CI checkpoint

The documentation-only showcase PR #601 completed its GitHub Actions job successfully on the latest recorded head: dependency installation, brand assets, icon normalization, TypeScript, lint, tests and production build all passed. This validates the documentation branch's repository checks; it does not validate the authenticated Learn journey or change production.

## Files inspected

- `src/app/api/learn/route.ts`
- `src/lib/cortex/lessonGenerationClient.ts`
- `src/lib/cortex/durableGenerationJob.ts`
- `src/app/api/cortex/generation/route.ts`
- `docs/GENERATION_RESILIENCE_STANDARD.md`

## Release truth

**Static code audit: passed with explicit acceptance gaps.**  
**Authenticated end-to-end Learn test: not run.**  
**Real-device/offline test: not run.**  
**Production behavior changed by this audit: no.**
