# Shadecode Snap & Extract: Local-first multimodal content workspace

**Status:** Approved direction; implementation starts with native Android image OCR.
**Date:** 2026-10-26

## Product intent

Turn learning material a student can legally access into a reusable, editable, searchable and privacy-conscious learning artifact. Inspired by the Snipping Tool workflow: capture or import, inspect, extract, edit, transform, redact and reuse.

The system is a local-first content workspace, not an automatic truth-repair system. Preserve the original and distinguish source content from OCR, formatting guesses, translations, corrections and generated completions.

## Core workflow

1. **Capture/import:** image first; PDF/text next; audio and MP4 later. Support screenshots, camera images, diagrams, tables, handwritten working and mixed pages.
2. **Process locally:** perform extraction on-device where supported. Do not upload the source by default. Clearly label cloud-dependent operations and ask before sending.
3. **Recover structure:** preserve reading order and geometry; detect text regions, tables, equations, charts, diagrams and captions. Keep bounding boxes and page/time coordinates for traceability.
4. **Represent more than one way:** retain the original image; store structured blocks; offer visual view, editable text, table view, accessible linear text and machine-readable data. Plain text is a derived representation, never the only surviving copy.
5. **Improve carefully:** spelling/format cleanup, translation, OCR ambiguity flags, missing-content suggestions and fill-in suggestions. Never silently invent missing source content. Show original, proposal, confidence/reason and accept/reject controls.
6. **Redact safely:** distinguish visual redaction of an exported image/PDF from redaction of extracted text. Exported visual redaction must be irreversible: flatten/replace covered pixels and remove underlying text/metadata where relevant. A black rectangle over selectable text is insufficient.
7. **Reuse:** save as a local artifact, search offline, copy/share selected representations, convert to notes or flashcards, and optionally add to lesson/question workflows.
8. **Sync deliberately:** source files and extracted content remain local by default. Sync/export only with clear user action and access controls. Never send private student material to a shared cache.

## Representation contract

Each artifact should eventually support:
- Source: original file metadata, local URI/content hash, MIME type, dimensions/pages/duration, created time, permissions and local-only status.
- Regions: stable IDs, page/frame/time, normalized bounds, reading order and kind (text, heading, equation, table, chart, diagram, image, caption, handwriting, unknown).
- Transcriptions: exact OCR/ASR output with engine/version, language, confidence and source-region links.
- Structure: paragraphs, lists, table cells, equations, chart axes/series, diagram labels/relationships and spatial order when supported.
- Alternatives: proposed spelling fixes, translation, inferred labels or missing-content suggestions, each with provenance, confidence, reason and acceptance state.
- Views: original, structured blocks, plain text, table, accessible linear view and other renderings.
- Redactions: selected targets, mode, audit state and export verification.
- Operations: local/cloud execution, model/version, timestamp, inputs and output hashes.

Do not claim a chart or diagram is semantically understood merely because OCR found labels. Unknown structure remains explicitly unknown.

## Delivery stages

### Stage 1: Android local image-to-text
- Import a user-selected image using Android's content picker.
- Run bundled on-device OCR with no server call.
- Display editable extracted text and source-image metadata where feasible.
- Offer deterministic text cleanup as a separate action; preserve raw OCR output.
- Support user-entered phrase redaction in the text representation with a clear preview.
- Copy/share only the chosen output.
- Work in airplane mode after installation; no API key, login or cloud request is needed for extraction.
- State clearly that OCR can misread handwriting, formulae, tables and diagrams; this stage does not semantically interpret charts/diagrams or redact source-image pixels.

### Stage 2: structured image extraction
- Region boxes, reading order, table reconstruction, equation-preserving text, graph/diagram classification and source-to-output traceability.
- Local persistence, searchable artifact library and deletion controls.
- Confidence and low-confidence review queue.

### Stage 3: local document and learning workflows
- PDF page extraction and mixed text/image pages; reuse existing positioned-PDF structure code where appropriate rather than creating a duplicate parser.
- Convert to notes, revision cards, questions and lesson resources with explicit provenance.
- Offline translation only when an appropriate on-device language model is installed; otherwise state that translation needs an optional cloud operation.
- Corrections/completions are proposals, never silent replacements.

### Stage 4: audio and video
- Import audio and MP4, extract local audio tracks and transcribe in chunks with timestamps/speaker labels when supported.
- Preserve timecodes, transcript confidence and links back to audio/video frames.
- Extract representative frames locally and analyze them with separate, capability-checked visual models. Do not claim full video understanding from a transcript alone.
- Heavy models are optional downloads with storage/battery estimates and explicit device capability checks.

### Stage 5: safe redaction and advanced transforms
- Region-level image/PDF redaction with flattened output and verification that covered source pixels/text are unrecoverable.
- Batch processing, language detection, translation, accessible representations and export formats.
- Sensitive content warning and local-first retention controls.

## Safety, integrity and privacy requirements

- Source files remain local unless the user explicitly chooses a cloud action.
- Do not upload images/audio/video by default or use private files for shared model/cache content.
- Keep original source immutable; store transformations as derived artifacts.
- Show provenance and confidence; no silent hallucinated repair or missing-content fabrication.
- Provide delete/export controls and avoid logging extracted private text.
- Test redaction against copy/paste, text extraction, layers, metadata and image recovery.
- Respect copyright and user rights when extracting or redistributing examination materials.
- Treat student names, school records and personal identifiers as sensitive.
- Low-end Android performance, battery, memory and app size are first-class constraints.

## Initial acceptance criteria

- User picks an image and obtains editable OCR text with no network connection.
- Raw OCR remains recoverable after cleanup or redaction preview.
- Phrase redaction replaces all matching occurrences in the derived text and makes the change visible before copying/sharing.
- No automatic claim of equation, graph, diagram or table correctness.
- The feature is labelled local image text extraction, not complete document intelligence.
- Android CI passes and the generated APK is inspected before claiming the feature is shipped.

## Reuse before rebuilding

- Existing src/lib/curriculum/document-structure.ts and extraction profiles already handle some positioned PDF structure. Extend/reuse them for PDF ingestion.
- Existing exam question extraction is a separate exam-specific pipeline; do not fork it into a competing general document parser. Add adapters only when the shared artifact contract is clear.
- Existing offline storage/sync systems remain authoritative for their domains. Do not sync private source files by default.
- Existing Cortex local/cloud routing is not a substitute for deterministic OCR or provenance.