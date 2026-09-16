# Native Local Model Candidates

Shadecode Student's native Android Cortex is local-first. This document records a small-model path that can complement Gemini Nano without making the base APK enormous.

## Candidate: Gemma 3 270M IT GGUF

Hugging Face repository: `ggml-org/gemma-3-270m-it-GGUF`

Why it is interesting for Shadecode Student:
- 0.3B parameters, suitable for experimentation on constrained devices.
- Instruction-tuned (`gemma-3-270m-it`), unlike the base Gemma 3 270M checkpoint.
- GGUF format is directly aligned with the planned llama.cpp runtime path.
- Quantized variants are available, including approximately 250 MB Q4-class files.
- The runtime can be optional instead of bundled into the base APK.

## Runtime policy

Do not ship a large model inside the initial APK. The native client should:

1. Use deterministic local engines for math, formulas, subject matching and cached curriculum.
2. Use Gemini Nano when AICore exposes a usable on-device model.
3. Offer an optional downloaded GGUF model when the device passes memory/storage checks.
4. Fall back to cloud Cortex only for work that needs more capability or when local inference is unavailable.

## First GGUF experiment

Target model:

`ggml-org/gemma-3-270m-it-GGUF`

Initial quantization to benchmark:

`Q4_K_M`

The benchmark must measure:
- cold-start load time
- warm inference latency
- tokens/sec
- peak memory
- battery impact during repeated short generations
- JSON reliability for Cortex lesson/practice schemas
- educational quality against a fixed local evaluation set

Do not promote the model to the default runtime from model size alone. It must pass the native Cortex quality and stability gates.

## Source

Hugging Face model card: https://huggingface.co/ggml-org/gemma-3-270m-it-GGUF
