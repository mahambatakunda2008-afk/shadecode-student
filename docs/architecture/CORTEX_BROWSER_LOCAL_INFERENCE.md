# Cortex Browser-Local Inference

Cortex now has a real browser-local inference adapter backed by WebLLM.

## Runtime

Default model:
`Llama-3.2-1B-Instruct-q4f32_1-MLC`

The model is loaded only in a browser with WebGPU. WebLLM downloads model artifacts on first use and caches them in the browser. Subsequent runs can reuse the cached model.

The model requires roughly 1.1 GB of VRAM according to WebLLM's current model configuration, so capability detection is mandatory. Devices that cannot provide WebGPU do not enter the local-model path.

## Failure contract

Local inference is an acceleration and privacy path, not a single point of failure.

`WebGPU unavailable -> cloud/deterministic fallback`

`model download/load failure -> cloud/deterministic fallback`

`empty/malformed output -> quality gate -> repair/fallback`

`quality failure -> reject output, never show it as a finished lesson`

## Lesson contract

The local model does not get to bypass Cortex curriculum resolution. The lesson request is resolved first, local curriculum grounding is supplied, and the same lesson-quality gate is applied after generation.

This prevents the local model from silently changing:
- subject
- topic
- curriculum
- learner level
- requested intent

## Progress integrity

WebLLM model-loading progress is deliberately NOT mapped onto lesson progress.

Downloading 30% of a model does not mean 30% of a lesson exists.

Lesson progress advances only when Cortex has completed actual teaching work.

## Why 1B first?

The initial model is deliberately small and marked low-resource by WebLLM. It is a compatibility/runtime probe and a useful local reasoning engine, not the final Cortex model.

The architecture allows a larger model to be selected when the device reports sufficient capability.

## Cost architecture

The browser performs inference locally when capable.

Vercel is not the inference engine.

Cloud generation remains a fallback for:
- unsupported devices
- unavailable WebGPU
- local model failures
- local quality rejection
- tasks requiring more capability than the local model can reliably provide

This is the beginning of the local-first execution ladder, not a claim that every device can run every Cortex task offline.
