# Autonomous Curriculum Intelligence

Shadecode Student should not depend on manually refreshed syllabus files.

The curriculum system uses a source-registry + watcher + extraction + quality-gate pipeline:

```text
Official authority
      ↓
source registry
      ↓
scheduled watcher
      ↓
landing-page/link discovery
      ↓
PDF/document retrieval
      ↓
content hash + text extraction
      ↓
version/change detection
      ↓
structured objective extraction
      ↓
provenance + quality checks
      ↓
review / verification gate
      ↓
curriculum registry
      ↓
skills → activities → assessments → Cortex
```

## Non-negotiable rule

**Detection can be automatic. Verification cannot be silently assumed.**

A newly discovered document is `draft` until its authority, qualification, syllabus version and extracted mappings pass the curriculum quality gate. This prevents a changed PDF, broken webpage, OCR mistake or unrelated document from silently changing exam guidance.

## What the watcher does

1. Visit an authority-controlled source page.
2. Confirm the source is reachable.
3. Discover linked syllabus/update PDFs on allowed domains.
4. Extract PDF text.
5. Compute hashes for the source page and extracted document.
6. Detect new/changed documents.
7. Produce an auditable report containing URLs, hashes, extraction status and errors.

The initial implementation runs weekly through GitHub Actions and can also be triggered manually.

## What comes next

The watcher is intentionally separated from promotion. The next ingestion layer will:

- compare the new document against the active syllabus version;
- identify changed, added, removed and renamed objectives;
- preserve the old syllabus version as immutable history;
- use structured extraction to create candidate objectives/topics/papers;
- attach page/section provenance;
- run curriculum quality tests;
- store approved versions in Supabase;
- invalidate or regenerate affected learning material;
- update Cortex retrieval context;
- notify administrators when human verification is required.

## Multi-board design

The watcher is board-agnostic. Each authority is represented by source metadata, so adding Cambridge, ZIMSEC, Pearson Edexcel, OxfordAQA, IB, national boards or tertiary institutions does not require changing the watcher engine.

The same extracted capability can then be mapped differently for each curriculum:

```text
Capability: functions

ZIMSEC O Level 4021
  → mapped only where the verified syllabus requires it

Cambridge IGCSE 0478
  → mapped according to that syllabus/version

Cambridge AS & A Level 9618
  → mapped according to that syllabus/version

University curriculum
  → mapped to the institution/course/version objectives
```

The capability library remains broad. The verified curriculum remains the filter.
