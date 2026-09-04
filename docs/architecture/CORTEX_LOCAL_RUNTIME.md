# Cortex Local Runtime

## Purpose

Cortex is designed as a local-first learning engine. The browser runtime provides on-device text generation without requiring a cloud AI request for every lesson. Cloud providers remain an optional enhancement and fallback when the learner is online.

## Browser runtime

The current web runtime uses a dedicated Web Worker and Transformers.js. The worker loads the ESM runtime from the Transformers.js CDN and runs:

- Model: `onnx-community/Qwen2.5-0.5B-Instruct`
- Quantized dtype: `q4`
- Preferred backend: WebGPU when available
- Fallback backend: WASM
- Streaming: `TextStreamer`
- Browser model cache: enabled

The React/UI thread never performs model inference directly. Generation is isolated in the worker so long inference does not block the learning interface.

## Preparation lifecycle

1. The learner opens Learn.
2. Cortex checks whether the browser has a usable WASM/WebGPU backend.
3. The first local generation prepares the model and caches it in the browser.
4. Preparation progress is exposed to the generation job.
5. A durable local-ready flag records successful preparation.
6. If the ready flag survives but the browser cache does not, generation clears the stale flag, recreates the worker, prepares again and retries once.
7. If local generation fails after emitting output, the partial output is not silently duplicated by the recovery path.

The ready flag is only a convenience signal. Actual runtime capability and successful model initialization remain authoritative.

## Lesson generation contract

Every lesson request carries the learner's actual prompt plus context:

- subject
- education level when known
- exam board/curriculum when known
- difficulty
- learning goal

A subject is context, not a substitute for the learner's prompt. A one-letter or ambiguous prompt must not silently become a fabricated topic.

Local generation is quality-gated before being accepted as a completed lesson. The parser expects substantive multi-section teaching content and checks for signals such as examples, checks, practice, misconceptions/traps, exam application and summary content. A failed local quality gate can fall back to cloud generation while online.

## Offline behavior

If the learner has already prepared the local model, lesson generation can continue without an internet connection. Requests that require local preparation while offline are retained as durable generation jobs and can resume when the device reconnects.

Useful learning state is persisted locally before relying on cloud synchronization. Cloud synchronization is therefore an enhancement, not the foundation of the Learn experience.

## Cloud fallback

When local inference cannot complete and the browser is online, the lesson client may use `/api/learn/generate`. The server authenticates the learner, resolves the lesson request, calls the configured provider chain, validates the generated lesson structure, persists the lesson and awards the appropriate XP.

Cloud generation must never be represented in the UI as local generation. The generation job records the active engine so the interface can truthfully distinguish local inference from cloud enhancement.

## Known constraints

- The first preparation can be large and device-dependent because the browser must obtain and initialize the model.
- WebGPU support varies by browser and hardware; WASM is the fallback.
- A 0.5B local model is intentionally lightweight, so the local quality gate must remain strict rather than pretending every generated draft is production-quality.
- Browser storage can be cleared independently of application state, which is why stale-ready recovery exists.
- The current browser runtime depends on the Transformers.js CDN for the runtime package and model artifacts during initial preparation. A future fully offline distribution should package the required runtime/model assets into an installable learning pack rather than relying on first-run network access.

## Verification standard

A local Cortex release is not considered verified merely because TypeScript, lint, tests and build pass. The acceptance bar is:

- Learn composer accepts an explicit subject and real learner prompt.
- First-run preparation reports progress and completes.
- Local generation streams without blocking the UI.
- WebGPU failure falls back to WASM where supported.
- Generated output is not duplicated during recovery.
- A completed lesson is persisted locally.
- Offline generation works after preparation.
- Unprepared offline requests remain queued rather than being lost.
- Cloud fallback is visibly and truthfully identified when used.
- No provider failure is allowed to masquerade as successful local generation.
