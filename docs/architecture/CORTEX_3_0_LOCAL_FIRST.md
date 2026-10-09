# Cortex 3.0: Local-first execution and reliability plan

## Why this exists

Recent lesson-generation failures show that a provider-independent execution boundary is not enough by itself. The browser already has WebLLM and deterministic offline lesson synthesis, but a lesson may still fail when the requested topic is not covered by a cached curriculum pack, the local model is not warm, the model download or inference fails, or the generated result fails the quality gate.

Cortex 3.0 is a reliability program, not a provider shopping list and not a UI redesign.

## Findings from the current implementation

- `src/lib/cortex/localModel.ts` uses WebLLM with `Llama-3.2-1B-Instruct-q4f32_1-MLC`.
- Local inference requires browser WebGPU support and an initialized model engine. A first load may download model assets.
- `src/lib/cortex/lessonGenerationClient.ts` uses a deterministic curriculum fallback when a matching offline lesson can be built, otherwise selects cloud/local lanes using the hybrid runtime.
- Browser-local lesson generation is section-based and has a quality gate. A malformed or too-thin section can make the whole local lane return no valid lesson.
- Model initialization publishes status/progress events, but the lesson runner previously did not translate those events into visible generation-job progress. That can make local recovery appear stalled.
- `src/lib/cortex/offlineLessonEngine.ts` deliberately refuses to invent curriculum knowledge when a matching verified pack is unavailable. Preserve this rule.

## Change in this branch

The lesson runner now subscribes to local-model status during local section generation and updates the job's progress/error text while the model initializes. This distinguishes local model setup from a cloud-provider retry and makes progress visible through the existing generation-job state.

This is a transparency fix, not proof that local generation now succeeds on every device. The branch must pass CI and real-browser testing before it is considered verified.

## Target execution contract

For each student learning task, Cortex should choose the cheapest reliable path that can meet the task's quality requirements:

1. **Verified local knowledge**: use exact cached curriculum records, question metadata, definitions and examples where they match the requested topic.
2. **Deterministic educational tools**: use code for calculations, algebraic checking, known marking rules, structured question selection, and progress. Do not ask a language model to do work a deterministic tool can verify.
3. **Warm on-device model**: use only after checking actual runtime capability and model readiness. Preserve partial sections and show model download/inference state.
4. **Cold on-device model**: do not hide the model download behind a generic lesson spinner. Show the download size/state, support cancellation, persist progress, and do not silently repeat downloads.
5. **Optional cloud reasoning**: use as an acceleration or quality enhancement when available, never as the only path for all learning.
6. **Honest limitation**: if no path can produce a correct, sufficiently complete lesson, report exactly what is missing and preserve the checkpoint. Do not label a skeletal template as a completed lesson.

## Required benchmark before declaring success

Run the same fixtures in at least these conditions: cloud disabled; cloud enabled; model already warm; cold model; WebGPU unavailable; browser refresh after a partial section; and provider timeout/quota failure.

### Initial fixture set

- Mathematics: coordinate geometry, including gradient derivation, line equations, worked examples and unseen practice.
- Mathematics: derive a result from first principles and verify numerical examples with deterministic code.
- Physics: explain a mechanism and distinguish definitions from derived relationships.
- Computer Science: trace an algorithm and validate a sample input/output pair.
- Curriculum-grounded task: select a topic that exists in the local verified pack and confirm every claimed objective is linked to matching knowledge.
- Unsupported/offline task: request a topic absent from cached knowledge and verify Cortex states the boundary rather than fabricating authoritative syllabus content.

### Record for each run

- Time to first useful content and total completion time.
- Model cold-start/download time separately from generation time.
- Lane selected and reason.
- Number of completed sections and whether they survive refresh.
- Validation failures and their specific reasons.
- Correctness review against an answer key or a qualified human reviewer.
- Device/browser/GPU capability, memory pressure and model version.
- Whether the task completes with all cloud credentials disabled.

## Acceptance gates

- No hidden whole-job retry loop.
- No progress percentage that stays unchanged while a known long operation is actively progressing.
- A provider outage cannot erase completed sections.
- Offline mode does not imply unverified content is authoritative.
- Every local model lane reports unsupported, loading, ready or failed accurately.
- Lesson correctness and completeness are measured, not inferred from block count alone.
- No claim of offline independence until the cloud-disabled benchmark passes on a real target device.

## Implementation sequence

1. Make initialization and execution state observable in the lesson job (started in this branch).
2. Add unit tests for lane choice, status transitions, checkpoint resume, and no-cloud operation.
3. Add a repeatable benchmark harness and fixture set.
4. Separate task planning from execution so the system can use deterministic tools and verified curriculum before model generation.
5. Make local inference opt-in for first-time large downloads, with clear storage/download state and cancellation.
6. Improve section-level validation and recovery so one malformed section does not discard previously validated sections.
7. Test on the actual HP EliteBook and an Android device before selecting a larger or different model.
8. Expand the same reliability contract to Tutor, Exam Simulator, marking and revision only after lessons pass.

## Non-goals

- Adding more providers as the primary fix.
- Replacing the whole application or redesigning its UI.
- Claiming a small local model is equivalent to a larger reasoning model.
- Inventing syllabus facts to make offline generation look successful.
- Marking this architecture as complete before automated tests and real-device benchmarks pass.
