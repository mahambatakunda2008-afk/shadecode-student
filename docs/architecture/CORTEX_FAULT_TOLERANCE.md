# Cortex Fault-Tolerance Contract

## Purpose

Cortex is the learning intelligence inside Shadecode Student. It must remain useful when an AI provider is slow, unavailable, rate-limited, malformed, disconnected, or unable to satisfy the teaching-quality contract.

The core rule is:

> **No single model call, provider, browser tab, network connection, or generation attempt is allowed to be the single point of failure for a learner's work.**

This document is the reliability contract for all Cortex engines, not only Learn.

## Reliability model

Every Cortex workflow follows:

`REQUEST → RESOLVE → PLAN → EXECUTE → VALIDATE → PERSIST → RESUME`

Each stage must either produce durable evidence or leave the workflow in a recoverable state.

### 1. Resolve

Resolve the learner, subject, curriculum context, intent, level, exam board, topic and goal before generation.

Never allow an arbitrary model response to silently replace the learner's configured subject.

### 2. Plan

Build a deterministic teaching/action plan before expensive generation.

Planning should be possible without a cloud model where practical:

- learner context
- subject access
- curriculum grounding
- topic decomposition
- prerequisites
- difficulty
- lesson/exam/practice structure
- recovery strategy

### 3. Execute

Generation is an implementation detail. Models fill planned content. They do not own the workflow.

Use bounded calls. Never wait forever.

### 4. Validate

Validate both:

- **structural correctness**: parseable data, required fields, safe sizes
- **learning correctness**: topic relevance, depth, checkpoints, examples, intent, curriculum constraints

A failed validation is not a reason to throw away good work.

### 5. Persist

Save the request identity before expensive work when the workflow is resumable.

Generation IDs must be idempotent. Replaying the same request must update/recover the same draft rather than create duplicate lessons.

### 6. Resume

A refresh, timeout, provider outage, tab close, or temporary database failure should leave enough state to continue.

Partial work must be preserved whenever possible.

---

# Failure matrix

| Failure | Required behavior |
|---|---|
| Network offline | Queue/resume locally. Never discard the request. |
| Provider timeout | Retry with bounded backoff, then try another generation path. |
| Provider 429 | Back off. Do not hammer the provider. |
| Provider 5xx/503 | Retry. Then use another provider/local path where available. |
| Malformed model output | Parse defensively, repair, then regenerate only the damaged unit. |
| Shallow/invalid lesson | Target the failed quality dimensions. Preserve good sections. |
| Browser refresh | Resume the same generation ID. |
| Tab closes | Durable draft remains resumable. |
| Duplicate request | Idempotency key prevents duplicate durable lessons. |
| Database save failure | Keep generated result in a resumable client/local state and retry persistence. |
| RLS/permission failure | Surface a real actionable error. Do not silently fabricate success. |
| Auth expiry | Re-authenticate/refresh, then resume the same job. |
| Missing configuration | Fail clearly at the boundary. Do not loop forever. |
| Local model unavailable | Fall through to cloud generation if online. |
| Cloud unavailable | Use local/cached/deterministic recovery where supported. |
| Quality gate rejects output | Repair, do not blindly regenerate the entire lesson. |

## Progress integrity

Cortex must never display fake progress.

Progress is evidence of completed work:

- planning complete
- section/unit complete
- validation complete
- persistence complete

Retries do not increase progress.

If 3 of 8 planned units are complete, the UI must reflect 3 of 8. A provider waiting for a response is not 70% complete.

## Generation identity

Every resumable generation has a stable ID.

The ID is carried through:

- browser job state
- API requests
- durable draft persistence
- retries
- recovery

The same ID means the same logical work.

## Partial results

Long workflows must be designed around partial results.

For a lesson:

`plan → section 1 → section 2 → section 3 → ... → assemble → validate`

If section 6 fails, sections 1-5 remain valid work.

Do not make the learner pay the latency cost again for material that already succeeded.

## Provider independence

Cortex must not be architected as:

`Student → one LLM provider`

It is:

`Student → Cortex Intelligence → Generation Runtime → available execution path`

The execution path may be:

1. local deterministic intelligence
2. local model
3. primary cloud model
4. alternate cloud provider
5. cached curriculum/content
6. deterministic fallback

Not every workflow can support every fallback. Each engine must declare which recovery paths are valid.

## Intelligence versus runtime

The **Generation Runtime** handles:

- timeouts
- retries
- provider routing
- parsing
- repair
- persistence
- recovery

**Cortex Intelligence** handles:

- learner context
- curriculum understanding
- planning
- sequencing
- mastery
- adaptation
- question selection
- misconception detection
- learning decisions

Keeping these separate prevents a provider outage from becoming a learning-system outage.

## Cross-module rule

The same contract applies to:

- Learn
- Exam Sim
- Exam Hub
- Work Checker
- Focus
- Timetable intelligence
- Revision
- Past-paper analysis
- Tutor/Cortex chat
- future virtual lab and coding engines

No new Cortex feature should introduce a new one-shot AI dependency when the workflow can be resumable.

## What “fault-tolerant” means here

Fault tolerance does **not** mean hiding failures.

It means:

- preserve the learner's intent
- preserve completed work
- retry transient failures
- repair local defects
- fall back where safe
- resume from durable state
- tell the learner when human action is genuinely required

Cortex should fail **narrowly**, not catastrophically.

## Implementation checklist for new Cortex engines

Before shipping an engine:

- [ ] stable generation/request ID
- [ ] deterministic request resolution
- [ ] bounded execution timeout
- [ ] retry classification
- [ ] exponential backoff with jitter
- [ ] retry limit
- [ ] provider fallback or explicit reason why none is safe
- [ ] defensive parsing
- [ ] quality validation
- [ ] targeted repair
- [ ] durable/partial persistence
- [ ] resume after refresh/interruption
- [ ] offline behavior where applicable
- [ ] honest progress reporting
- [ ] idempotent persistence
- [ ] observable failure logs
- [ ] user-safe error state
- [ ] tests for transient and permanent failures

## Current Learn pipeline

Learn already has several of these protections:

- subject resolution
- generation IDs
- resumable draft rows
- bounded AI calls
- client retries
- local-model opt-in
- deterministic fallback for supported topics
- quality gates
- targeted repair
- offline storage
- honest stage progress

The next architectural step is to move from whole-lesson retries toward **section-level durable generation**, so a failed section does not invalidate successful sections.

That is the standard Cortex should use for every future long-running workflow.
