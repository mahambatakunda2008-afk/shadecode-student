# Cortex 2.0 Execution Events

## Purpose

Cortex execution events describe the control-plane outcome of model-backed work without duplicating provider telemetry.

The execution boundary emits:

- `cortex.execution.started`
- `cortex.execution.completed`
- `cortex.execution.failed`

## Failure classes

- `timeout`
- `provider_unavailable`
- `rate_limited`
- `invalid_response`
- `empty_response`
- `grounding_unavailable`
- `execution_exception`
- `aborted`
- `unknown`

## Reliability rules

1. Event emission is bounded.
2. Event listeners cannot break the student operation.
3. Prompts are never stored in these events.
4. Raw provider error messages are not stored in these events.
5. Provider-attempt telemetry remains owned by `src/lib/ai.ts`.
6. A durable database sink must use the repository's verified event persistence contract rather than inventing a new table.

## Current implementation

`src/lib/cortex/runtime/executionEvents.ts` maintains a bounded in-process buffer and subscription mechanism. This is an integration point for future durable learning/evidence storage, not a replacement for it.

`src/lib/cortex/runtime/execution.ts` emits lifecycle events around every text execution operation and classifies exceptions. A null/empty AI result is explicitly classified as `empty_response`.

## Why this matters

Cortex can now distinguish:

**started → completed**

from:

**started → failed → failure class**

That gives the control plane a vocabulary for recovery policy, reliability analysis, and future execution routing without coupling those decisions to a particular provider.
