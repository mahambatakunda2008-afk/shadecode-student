# Cortex 2.0 Architecture Direction

## Core principle
> AI is not an API call.

Shadecode Student treats intelligence as a system composed of memory, context, local capability, cloud capability, tools, data, validation, reliability, recovery, and the student's actual learning workflow.

## Current repository findings

### Already present
- Durable Cortex generation jobs in Supabase.
- Browser-local generation and local curriculum fallback.
- Hybrid execution selection.
- Generation leases and heartbeats.
- Atomic generation checkpoints and reconciliation.
- Learning-quality gates.
- Curriculum grounding and offline curriculum packs.
- Persistent learner/Cortex memory.
- Runtime AI gateway for some Cortex intelligence requests.
- Cortex event infrastructure.
- Native Android Cortex/local-model infrastructure.
- Extensive Cortex tests and architecture documentation.

### Architectural problems found
1. Multiple AI entry points.
   - /api/cortex routes some requests through cortexAI.
   - Lesson generation currently flows through /api/learn.
   - Legacy /api/cortex/generate-lesson directly imports callAI.
   - src/lib/cortex/lessonGenerator.ts also directly imports callAI.
   This means Cortex is not yet the single intelligence boundary.

2. Two meanings of memory.
   - CortexMemory is an in-process question/answer cache.
   - cortex_memory is persistent learner state in Supabase.
   These should become explicit layers rather than both being called simply memory.

3. Routing exists but is not the complete decision engine.
   - CortexRouter has a complexity classifier.
   - Its production default still routes both simple and complex questions to TeacherAI.
   - Lesson generation has its own execution policy and does not use the same general Cortex routing abstraction.

4. Generation recovery is sophisticated but fragmented.
   - The lesson client contains local, cloud, verified-curriculum, browser-model, durable, lease and persistence logic.
   - The server contains section repair and checkpointing.
   - This is useful machinery, but the policy is distributed across client and server.

5. Legacy paths create maintenance risk.
   - The old direct lesson generator and direct /api/cortex/generate-lesson path can diverge from the durable lesson pipeline.

## Cortex 2.0 target

Cortex becomes the intelligence control plane:

Student request -> learner/context resolution -> memory retrieval -> curriculum/data grounding -> capability and execution decision -> tool/model execution -> structured validation -> recovery/fallback -> persistence -> learning evidence -> memory/event update -> student-facing action

### Execution lanes
1. Deterministic/local data
2. Verified curriculum/local lesson synthesis
3. Warm browser/device model
4. Cloud model/provider
5. Tool-assisted execution
6. Recovery/repair

No lane should be exposed directly to feature UI as an independent intelligence architecture.

## Reliability rule
A provider failure must not equal a Cortex failure.
A model is replaceable infrastructure.
The student's learning task is the durable unit.
Generation checkpoints therefore preserve the task, not merely the HTTP request.

## Memory rule
Separate:
- interaction/cache memory: short-lived performance optimization
- learner memory: durable facts about learning state
- learning evidence: observations/events from actual student behavior
- curriculum knowledge: authoritative educational data

The model should receive only the relevant context assembled from these layers.

## Product rule
Do not make every feature an AI feature.
Use deterministic systems where they are better: curriculum lookup, calculations, marking rules, progress calculations, scheduling, known question metadata, and offline content.
Use models where reasoning, generation, teaching, or interpretation is actually valuable.

## Immediate implementation order
1. Inventory every direct AI provider call.
2. Mark canonical versus legacy AI paths.
3. Make lesson generation use one Cortex-controlled server boundary.
4. Preserve the existing durable/checkpoint/local fallback machinery.
5. Unify execution policy and failure classification.
6. Separate cache memory from learner memory.
7. Make Cortex produce structured execution/evidence events.
8. Remove or quarantine redundant legacy generation paths.
9. Add end-to-end tests for cloud failure, local fallback, persistence failure, resume, and provider replacement.
10. Only then expand Cortex intelligence across Exam, Tutor, Math Checker, Focus and Timetable.

## Non-goals
- No visual redesign.
- No wholesale rewrite of Shadecode Student.
- No dependency on Microsoft services.
- No single-model lock-in.
- No add-another-provider-as-default reliability strategy.
- No pretending generated content is authoritative curriculum knowledge without grounding.

## Definition of done
Cortex 2.0 is successful when a student can request a learning task and Cortex can autonomously determine the safest and most useful execution path, complete it or recover meaningfully, preserve progress across interruption, validate the result, and learn from the outcome without the UI needing to understand which model or provider performed the work.