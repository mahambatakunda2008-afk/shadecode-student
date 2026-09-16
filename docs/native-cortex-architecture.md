# Native Cortex Architecture

Shadecode Student does not treat Gemini as the AI architecture. Gemini Nano is one local provider inside a capability-first Cortex runtime.

## Execution order

1. **Local deterministic engines**
   - math checks
   - formula evaluation
   - curriculum matching
   - cached knowledge
   - local state and progress
2. **Local model providers**
   - Android Gemini Nano through AICore
   - future LiteRT-LM models
   - future llama.cpp/GGUF providers
3. **Cloud Cortex**
   - the native client calls the existing lesson/Cortex APIs
   - the server owns provider selection, quality gates and curriculum grounding
   - current web AI chain supports Ollama when configured, OpenRouter, multiple Gemini keys, Cloudflare and optional OpenAI
4. **Cache/offline result**
   - return useful local state instead of blocking the learner

## Why this design

A model should only be called when the task actually needs one. This reduces latency, battery use, network dependency and inference cost.

The native app also does not hard-code a cloud vendor into every feature. Feature code talks to `NativeCortexOrchestrator`; provider choice belongs to Cortex.

## Local model expansion

Google's current Android guidance supports Gemini Nano through AICore for low-latency, offline inference. Google's current Gemma deployment guidance also identifies LiteRT-LM and llama.cpp as on-device paths. LiteRT-LM should be integrated separately from Gemini Nano because its Android/JVM dependency and runtime requirements differ from the current Java 17 build.

For llama.cpp, the Android path is arm64-v8a and supports runtime hardware feature selection. Model files should be downloaded separately rather than bundled into every APK, keeping the base application small.

## Non-negotiables

- Never fake local inference.
- Never silently switch to a cloud provider while the UI claims the result was generated offline.
- Never make a single provider a hard dependency for learning features.
- Prefer deterministic local computation over an LLM where possible.
- Keep provider telemetry separate from learner-facing content.
- Cache successful results where the request is safe to reuse.
