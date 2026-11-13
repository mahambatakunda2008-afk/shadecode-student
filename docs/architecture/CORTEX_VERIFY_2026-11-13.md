# Cortex Verify

**Date:** 2026-11-13  
**Product status:** Existing implementation being consolidated and expanded  
**Replaces:** Math Checker  
**Shared capability:** SNAP & EXTRACT  
**Platforms:** Web/PWA, Android, desktop

## Product contract

Cortex Verify is the student's workspace for submitting or capturing work, getting it assessed, and receiving help to understand or improve it. It is not a mathematics-only checker.

Cortex Verify has exactly two top-level modes:

1. **Mark Mode** — the student has attempted work and wants it assessed.
2. **Help Mode** — the student is learning, stuck, or wants guidance with a question or concept.

SNAP & EXTRACT is not a third mode or separate product. It is the shared capture and extraction capability available inside both modes.

## 1. Mark Mode

Purpose: assess work the student has already attempted.

Inputs:
- Typed question and answer.
- Handwritten work captured by camera or imported image.
- Extracted text or structured content from SNAP & EXTRACT.
- Supported document/PDF pages when the relevant extractor is available.
- Relevant subject, board, qualification, syllabus, topic, question and marking criteria where known.

Expected behavior:
- Identify what the question requires.
- Read the student's actual answer and working.
- Evaluate each meaningful step, not only the final answer.
- Award method, accuracy and follow-through marks where the rubric supports them.
- Identify correct, incorrect, incomplete and ambiguous parts.
- Explain where and why marks were lost.
- Show a suitable model method or answer when appropriate.
- Annotate or reference the exact region/step being discussed.
- State confidence and request a clearer capture rather than guessing.
- Distinguish official mark-scheme alignment, deterministic marking and AI-assisted estimates.
- Never invent an official score, rubric or mark allocation.

Marking must be subject-aware. Mathematics is only one case. The engine must progressively support structured calculations, essays, short answers, diagrams, graphs, labelled drawings, tables, practical work and other syllabus-specific response types.

## 2. Help Mode

Purpose: help the student make progress without forcing an answer reveal.

The student controls the level of assistance:
- **Hint:** a nudge that preserves the student's opportunity to solve the problem.
- **Method:** explain the relevant concept, formula, approach or sequence without automatically revealing the final answer.
- **Worked solution:** provide a complete explanation when explicitly requested.

Expected behavior:
- Interpret the question and identify the relevant subject/topic where evidence allows.
- Explain command words and what the question is asking.
- Surface prerequisites, definitions, formulae and relevant principles.
- Guide one step at a time.
- Accept follow-up questions and student attempts.
- Explain alternative valid methods.
- Support diagrams, graphs, tables and written explanations.
- Offer a similar practice question after the student understands the original.
- Adapt explanations using the learner's approved Cortex memory and preferences.
- Do not reveal a full answer when the student selected a hint or method.

Help Mode must support both guided assistance and direct explanation. These are assistance levels inside Help Mode, not separate top-level modes.

## 3. Shared SNAP & EXTRACT capability

SNAP & EXTRACT is the common input pipeline for Mark Mode and Help Mode.

Capture/import:
- Camera capture and screenshots.
- Image and document import.
- Multi-page capture.
- PDF pages and mixed text/image documents as supported.
- Typed/pasted content.

Extract/represent:
- Original source image/document retained as the immutable source.
- OCR transcription with confidence and source-region links.
- Editable extracted text.
- Handwriting and mathematical notation recognition where supported.
- Reading order, page coordinates and region boundaries.
- Structured tables, equations, graphs and diagrams when a capable extractor exists.
- Clear unknown/ambiguous labels when semantics cannot be established.
- User correction of extraction errors before submission.

Integrity:
- Never silently repair, invent or fill missing source content.
- Keep raw extraction separate from cleanup, correction, translation and generated suggestions.
- Show proposed changes with accept/reject controls.
- Preserve provenance from each extracted block back to its source region.
- Do not claim that a diagram, graph or table is understood merely because text labels were detected.

The same extracted artifact can be sent to either Mark Mode or Help Mode without requiring the student to capture or transcribe it again.

## 4. Offline and online behavior

Offline is a real operating mode, not a queued cloud request disguised as offline AI.

### Offline-ready work
- Capture/import and locally retain source material.
- Run local OCR/extraction where the platform has the required model/runtime.
- Review and correct extracted text.
- Save the original and derived artifact locally.
- Reopen, search, annotate and delete saved artifacts.
- Use deterministic marking for question types with a validated local marker/rubric.
- Use downloaded, verified mark schemes, subject references and help packs.
- Use an installed local model for supported Help Mode tasks when device capability checks pass.
- Preserve attempts, answers, annotations and pending actions across reloads, process death and device restart.
- Clearly show which operations are available offline, download-required, online-only or unverified.

### Online enhancements
- Optional cloud-assisted OCR and visual interpretation.
- Advanced AI-assisted marking and explanations.
- More complex diagram/graph interpretation.
- Additional curriculum resources and model capabilities.
- Safe synchronization and backup.

Before sending private student images/documents to a cloud provider, explain the operation and obtain the required user consent. Source files remain local by default.

If a task cannot be completed offline, preserve the student's work and state exactly what requires connectivity. A queued request is pending work, not a completed mark or explanation. Reconnect processing must be idempotent and must not duplicate attempts or learning evidence.

## 5. Cross-platform contract

Web/PWA, Android and desktop must share:
- The same two-mode product behavior.
- A common Verify attempt and extracted-artifact contract.
- Subject and curriculum identity.
- Provenance and confidence semantics.
- Owner-scoped persistence and deletion behavior.
- Consistent pending/offline/online states.
- Compatible result and annotation representations.

Platform adapters may use suitable native capabilities, but they must not create competing student records or different marking semantics.

## 6. Privacy and learner control

- Student captures and extracts are private and owner-scoped.
- Do not place private source files or extracted text in shared caches.
- Do not log raw student work or extracted personal data.
- Preserve explicit delete/export controls.
- Account switching must not expose the previous learner's work.
- Account deletion must include Verify artifacts, queues and local caches according to the deletion contract.
- Students can correct OCR output and challenge uncertain feedback.
- Marking uncertainty must be visible rather than hidden behind a confident score.

## 7. Existing implementation to reuse

The current repository already contains:
- `src/app/(app)/workmate/page.tsx` and `src/components/cortex/CortexVerifyPanel.tsx`.
- `src/hooks/useCortexVerify.ts` with internal `check` and `help` operations.
- `src/app/api/cortex/verify/route.ts` for authenticated, rate-limited cloud image/text processing.
- `src/lib/offline/cortex-queue.ts` for account-scoped IndexedDB attempts and retry.
- `src/lib/cortex/hybridJson.ts` for text-only local/cloud hybrid JSON execution.
- Android-native SNAP & EXTRACT OCR and a private local extract library, documented in `SNAP_AND_EXTRACT_LOCAL_FIRST_2026-10-26.md`.

Do not create a competing Verify page, a second attempt queue, or a duplicate document parser. Extend these foundations after tracing their real behavior.

## 8. Current verified gaps

- The old Math Checker route is a compatibility redirect; Workmate is the active Verify workspace.
- The visible product surface previously advertised three static labels while the actual panel already had two internal modes. The visible UI now presents Mark Mode and Help Mode.
- Web/PWA now has consent-gated cloud image transcription, an editable extracted-text review step, and account-scoped IndexedDB capture storage with source-image retention, reopen and delete controls. The transcription is explicitly labelled AI-assisted, not verified OCR.
- The extraction endpoint does not persist source images server-side. The student must explicitly consent before the browser sends an image for cloud extraction or image-based marking/help.
- Web/PWA local OCR is still missing. Its saved captures and reviewed text can be reopened offline, and text-only attempts can use the existing local runtime when ready; this does not provide offline image-to-text extraction.
- Text-only attempts can use the existing browser-local hybrid runtime when a model is already ready. This does not prove first-launch offline availability or local image understanding.
- Failed attempts are stored in an account-scoped queue and retried on reconnect. This is not the same as offline marking or offline help.
- Android OCR exists as a separate local capability and is not yet integrated into the shared Verify workflow.
- PDF, structured equations/tables/graphs/diagrams, source-region traceability and local artifact parity across web/Android/desktop remain incomplete.
- Current subject choices and marking behavior are not yet complete across all supported curricula and response types.
- Desktop is currently a shell foundation; complete local workspace parity remains outstanding.

## 9. Delivery sequence and acceptance gates

1. **Product/UI alignment:** one visible Mark Mode and one visible Help Mode; remove Math Checker naming from current navigation and product copy.
2. **Shared artifact contract:** represent source, extracted blocks, confidence, coordinates, provenance and user corrections without losing the original.
3. **SNAP & EXTRACT integration:** web/PWA has consent-based online transcription and local artifact retention; next add real local browser OCR, then connect the existing Android OCR library and desktop capture/extraction to the same artifact contract.
4. **Offline Mark Mode:** deterministic local marking for explicitly supported question types, downloaded rubrics/resources, honest unsupported states.
5. **Offline Help Mode:** local help packs and optional pre-provisioned local models with device-capability checks.
6. **Online enhancement:** consent-based cloud OCR/vision, advanced marking and explanations.
7. **Cortex learning evidence:** record verified attempts, misconceptions and outcomes idempotently; do not treat unverified AI estimates as authoritative mastery.
8. **Cross-platform parity:** verify identical core workflows across web/PWA, Android and desktop.
9. **Acceptance:** airplane mode, reload/reopen, force-close, account switch, reconnect, duplicate replay, conflict, low storage, low-memory device, accessibility, and real-device testing.

A feature is not complete because the page renders, a request is queued, or a model returns JSON. Completion requires an end-to-end student workflow with reliable evidence and explicit offline/online behavior.
