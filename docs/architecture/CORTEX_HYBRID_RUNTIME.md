# Cortex Hybrid Runtime

## Why Cortex is hybrid

Cortex should not behave like a single remote model with a browser-shaped front end.

A learner request can have several independent pieces of work happening at once:

- deterministic learner/context resolution
- curriculum grounding
- local inference
- cloud inference
- validation
- persistence and recovery

The runtime therefore supports multiple execution lanes while keeping one authoritative generation identity.

## Runtime modes

| Mode | When | Behaviour |
| --- | --- | --- |
| deterministic | offline and no usable model | deterministic Cortex intelligence |
| local | browser model is warm and cloud is not useful | local inference |
| cloud | cloud is available but local model is not warm | cloud generation |
| parallel-prep | local model is possible but not warm | cloud proceeds; local capability is detected/prepared without forcing a model download |
| parallel | browser-local model is already warm and cloud is available | local and cloud generation race independently |

### Important guardrail

parallel does not mean "download a large model every time a learner opens Learn."

The browser-local model must already be warm. First-load model acquisition is intentionally not triggered just to create a duplicate cloud request.

## Lesson execution

```text
                    +-- Browser-local lesson lane
                    |
REQUEST -> CORTEX --+-- Cloud lesson lane
                    |
                    +-- Deterministic context / quality gates
                              |
                              v
                       FIRST VALID RESULT
                              |
                              v
                         QUALITY GATE
                              |
                              v
                         ONE SAVE PATH
```

The two generation lanes produce candidates independently.

firstSuccessful() ignores a failed lane and waits for another lane that can still succeed. The first valid candidate is then passed through the same persistence path.

## Winner protection

A losing lane is never allowed to turn a completed job back into partial or generating.

Before persisting progress, the cloud lane checks the authoritative generation job. Once the winning lane marks the job complete, the losing lane stops persisting.

This matters because both lanes may still have an in-flight network/model operation when the winner is selected.

## No fake progress

Progress belongs to completed work, not elapsed time.

- A speculative lane does not increase progress merely because it started.
- Failed lanes do not advance progress.
- The final winner goes through the normal quality gate and persistence path.
- Durable generation state remains the recovery source across refreshes.

## Cost control

Hybrid execution is not "always run everything twice."

Cortex should prefer:

1. deterministic local preparation
2. cached/local intelligence
3. a warm browser model when available
4. cloud generation when useful
5. peer execution when the future protocol makes it safe

Parallel full generation is reserved for cases where the warm local lane provides a real latency/reliability advantage.

## Failure model

If one lane fails, the other lane can still complete. If both fail, the existing Cortex fault-tolerance pipeline handles retry, offline fallback, or a surfaced failure.

## Future expansion

The same runtime should become the shared execution layer for:

- Exam Sim
- Work Checker
- Past Paper analysis
- Cortex Tutor/chat
- Revision planning
- Focus intelligence
- Timetable intelligence
- future virtual lab and coding assistance

Peer-assisted execution remains a future lane. It must not receive learner data until consent, authentication, encryption, task isolation, cancellation, quotas, and integrity validation are implemented.

## Current integrations

The shared hybrid JSON executor is now used by:

- **Learn:** warm local and cloud lesson lanes.
- **Exam generation:** local/cloud validated exam generation.
- **Exam marking:** local/cloud marking candidates with the normal cached-report recovery path.
- **Workmate / Cortex Verify:** text-only verification can use local/cloud; image verification remains cloud because the browser-local text model is not an image-understanding path.
- **Socratic Tutor:** deterministic tutoring remains the immediate safety net while warm local/cloud Cortex can produce a richer tutor response.
- **Past-paper Question Bank:** question help can use the warm local/cloud race.

The executor also propagates cancellation to cloud fetches where the losing lane can still be stopped. This prevents a successful local result from needlessly waiting for or continuing a response stream.

## Deliberate limits

Not every task should be duplicated.

- PDF/image-heavy work stays on the capable server path until a suitable local multimodal model exists.
- First-load browser model downloads are not silently triggered by normal learning actions.
- Deterministic curriculum and learner-state logic remains outside the model race.
- Cloud responses still pass through module-specific validation.
- Offline queues and durable generation jobs remain recovery mechanisms, not model providers.
