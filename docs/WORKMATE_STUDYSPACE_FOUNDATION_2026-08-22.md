# Workmate + StudySpace Foundation

Date: 2026-08-22

## Decision

StudySpace is the shared work surface for Workmate, practice, assessment, exam, lessons and Canvas. Workmate is not a separate isolated workspace with a competing persistence model.

The existing `WorkObject` contract already provides the common object boundary for prompt, response, working, attachments, assessment, marks, timing and lifecycle state.

## Product boundary

- **Workmate**: help a learner inspect, solve, explain, verify and improve arbitrary schoolwork.
- **StudySpace**: the persistent workspace that holds the work and lets the learner move between modes.
- **Canvas**: free-form working/reasoning surface within the same workspace.
- **Lessons**: curriculum/AI-generated learning experiences that can create or consume WorkObjects.
- **Practice / Assessment / Exam**: activity modes that reuse the same work representation rather than creating isolated records.
- **Cortex**: shared intelligence layer; Workmate should call Cortex rather than growing a parallel tutor/checker stack.

## Current repository reality

The Student repository already contains `src/lib/studyspace/types.ts`, `store.ts`, and the StudySpace route. The route exposes Workmate, Lesson, Practice, Assessment, Exam and Canvas modes, and saves WorkObjects locally. The current local store is not account-scoped and therefore must not be treated as a complete multi-account data boundary.

## Next implementation order

1. Account-scope StudySpace persistence.
2. Add durable local mutation/sync semantics to WorkObjects.
3. Add explicit status/reconciliation state rather than a simple "saved locally" message.
4. Connect Workmate to the shared WorkObject lifecycle.
5. Connect Cortex through a single adapter boundary.
6. Add attachments/images and structured answer/working blocks.
7. Add exam/assessment recovery using the same persistence primitives.
8. Add server-side persistence only after the local contract is deterministic.

## Non-goals for this pass

- Do not duplicate Workmate as another independent app architecture.
- Do not make local IndexedDB an authorization mechanism.
- Do not claim full offline sync until server reconciliation and conflict behavior exist.
