# Shadecode Student Native Local Model Strategy

Shadecode Student uses a local-first Cortex architecture. A language model is an optional reasoning component, not the foundation of the app. Core learning, curriculum matching, math/formula evaluation, cached lessons, progress, and offline navigation must remain functional when no model is available.

## Runtime order

1. **Deterministic local engines**
   - curriculum matching
   - formula evaluation
   - math validation
   - cached explanations and lessons
   - progress/state operations
2. **Gemini Nano / Android AICore**
   - first local generative runtime when the device exposes it
   - no network request required
   - short structured generation only
3. **Bundled or downloaded GGUF runtime**
   - llama.cpp Android backend
   - optional model selected by device capability and available storage/RAM
   - model files stay on-device
4. **Cloud Cortex**
   - only when local generation is unavailable or the task is intentionally escalated
   - server-side provider chain remains responsible for provider selection

## Why the second local runtime matters

Gemini Nano depends on device/runtime availability. It cannot be treated as the only local intelligence path. A llama.cpp-backed GGUF runtime gives Shadecode Student an independent local path and lets us support devices where AICore/Gemini Nano is unavailable.

The upstream llama.cpp Android implementation supports loading GGUF models from app-private storage and streaming generated tokens through a Kotlin-facing Android binding. Its current Android documentation supports arm64-v8a and runtime hardware feature detection.

## Model policy

Do not ship a large model inside the base APK. Models should be optional assets downloaded into app-private storage, with:

- explicit model metadata
- checksum verification
- resumable downloads
- storage-size checks
- RAM/device capability checks
- cancellation and cleanup
- versioned model directories
- one active generation job at a time

The first GGUF candidate should be a small instruction-tuned model appropriate for mobile memory limits. Model selection must be validated on real Android hardware before becoming a default.

## Capability model

The native router should expose capabilities rather than model names:

```text
LOCAL_RULES
LOCAL_GENERATION_SHORT
LOCAL_GENERATION_LONG
LOCAL_CHAT
LOCAL_MATH
LOCAL_DOCUMENT
CLOUD_GENERATION
CLOUD_MULTIMODAL
```

A device can therefore have, for example:

```text
math = local
curriculum = local
cached_lessons = local
generation_short = Gemini Nano
generation_long = GGUF
multimodal = cloud
```

This prevents the product from becoming coupled to one model vendor.

## Failure behaviour

A local model failure must never blank the Learn screen. Cortex should:

1. return a cached result when available;
2. try the next local runtime when appropriate;
3. use cloud Cortex when connectivity and policy permit;
4. otherwise return a clear offline state while preserving the user's work.

## Build strategy

Keep the Android app on Java 17/Kotlin. Add the GGUF runtime as a separate native module only after the existing Gemini Nano path has a green CI build. Do not add a second large native dependency until CI can build and package the current native client reliably.

The intended architecture is therefore:

```text
                 SHADECODE CORTEX
                        |
                Capability Router
                        |
          +-------------+-------------+
          |             |             |
      Local Rules   Local Models    Cloud
          |             |             |
       Math/RAG     +---+---+      Provider chain
                    |       |
               Gemini Nano  GGUF
                           llama.cpp
```
