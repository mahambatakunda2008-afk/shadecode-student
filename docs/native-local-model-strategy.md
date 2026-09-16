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
3. **Bundled or downloaded GGUF / LiteRT runtime**
   - llama.cpp Android backend for GGUF models
   - LiteRT-LM for models published in that format
   - optional model selected by device capability and available storage/RAM
   - model files stay on-device
4. **Cloud Cortex**
   - only when local generation is unavailable or the task is intentionally escalated
   - server-side provider chain remains responsible for provider selection

## Current Hugging Face candidates

These are candidates for validation, not hard-coded product dependencies:

- `litert-community/SmolLM2-135M-Instruct` is tagged for `litert-lm`, `on-device`, and text generation. Its small size makes it a useful candidate for a very lightweight local runtime. Validate quality and Android latency before adoption.
- `tensorblock/SmolLM2-360M-Instruct-GGUF` provides GGUF files compatible with llama.cpp and is Apache-2.0 licensed. Its model card includes multiple quantizations, including a Q4_K_M file around 0.27 GB. This is a practical candidate for a downloadable GGUF tier.
- `HuggingFaceTB/SmolLM2-360M-Instruct` is the upstream 361.8M-parameter instruction model. Use it as the reference model when comparing quantized/mobile variants.

The candidates above are deliberately small. Shadecode should not equate parameter count with teaching quality. Every candidate must pass a Shadecode evaluation set covering curriculum grounding, explanation quality, hallucination resistance, structured JSON reliability, latency, RAM use, battery impact, and offline recovery.

## Why the second local runtime matters

Gemini Nano depends on device/runtime availability. It cannot be treated as the only local intelligence path. A llama.cpp-backed GGUF runtime gives Shadecode Student an independent local path and lets us support devices where AICore/Gemini Nano is unavailable. LiteRT-LM provides another route for models explicitly packaged for on-device inference.

The upstream llama.cpp Android implementation supports GGUF models from app-private storage and Android hardware-aware execution. The exact runtime and model should be selected after testing on representative Shadecode devices.

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
action_or_tiny_task = LiteRT-LM
multimodal = cloud
```

This prevents the product from becoming coupled to one model vendor.

## Shadecode model evaluation gate

Before a model becomes a production local provider, evaluate it against:

1. curriculum fidelity
2. teaching depth
3. factual accuracy
4. structured lesson reliability
5. response latency
6. peak RAM
7. battery/thermal behaviour
8. cold-start time
9. offline repeatability
10. graceful fallback behaviour

A model that is fast but teaches badly is not a successful local runtime.

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
                    |   |   |
               Nano  GGUF LiteRT-LM
                    |   |   |
                 on-device runtimes
```
