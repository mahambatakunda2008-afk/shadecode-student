# Offline AI Cost Policy

Shadecode's core offline intelligence must not require a paid inference API or recurring per-student AI subscription.

## Allowed

- Open-weight models whose licenses permit the intended use and redistribution.
- Local inference on the learner's device.
- Deterministic local engines.
- Model artifacts distributed as part of an approved Shadecode release.
- Optional cloud inference when the learner explicitly has connectivity and the product policy permits it.

## Not allowed as a core dependency

- A paid hosted LLM API required for tutoring.
- A network request required to initialize Cortex.
- A subscription-gated local model runtime.
- A proprietary model artifact whose redistribution terms conflict with Shadecode's distribution model.

## Licensing gate

Before an artifact becomes a release dependency, record its exact upstream model, version, license, source URL, redistribution terms, and any additional obligations. Distillation, pruning and quantization do not remove upstream licensing obligations.

## Economics

Compute used by Shadecode to train/distill/compress models is a development cost. It must not become a per-request cost imposed on students for basic offline functionality.
