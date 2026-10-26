# Preloaded Learning Library Audit and Execution Plan

**Audit date:** 2026-10-26  
**Scope:** Repository architecture for preloaded educational content, lesson reuse, Classic mode, curriculum alignment, and offline access.  
**Evidence boundary:** Repository files and a read-only query against the active production Supabase project were inspected. The database counts below are live query results; this audit does not run the app or verify a live deployment.

## Executive finding

Shadecode has meaningful foundations for a reusable learning library, but the repository does **not** establish that learners receive a broad, curated, preloaded course library comparable to a traditional edtech app. The current shared lesson library is primarily populated from lessons learners have already started using. Curriculum datasets and knowledge records are useful structure and grounding, but they are not automatically equivalent to complete, reviewed, student-facing lessons for every topic.

This distinction matters: a syllabus map tells us what should be taught; a verified learning asset teaches it.

## Evidence found

### 1. The shared lesson library is usage-fed, not a complete course catalogue

Migration `supabase/migrations/20261010180000_lesson_library.sql` creates `public.lesson_library` and a trigger that publishes from `public.learn_lessons` only when the lesson has at least four blocks and learner progress is at least 30%. The migration also backfills eligible existing lessons.

Implications:
- A new learner can arrive before the shared library contains the topic they need.
- Coverage depends on previous learner activity, not a declared syllabus-by-syllabus publishing plan.
- The table has subject/topic/title and lesson blocks, but the migration does not establish explicit board, qualification, syllabus version, topic/objective identity, review status, source provenance, or asset-quality fields as library-level requirements.
- Helpful votes are useful feedback, but are not a substitute for academic verification.

Relevant implementation:
- `src/lib/library/store.ts` loads the table and caches it in process memory for five minutes.
- `src/lib/library/recover.ts` tries to find a substitute lesson using title/topic token overlap, requiring 60% coverage of requested topic tokens and at least four blocks.
- `src/app/api/library/recover/route.ts` returns 404 when no suitable lesson exists, rather than fabricating a match. That is the correct safety posture, but it exposes the catalogue-coverage gap.
- `src/app/api/library/search/route.ts` searches the same table. Search is retrieval over existing lessons, not a content authoring or syllabus-completeness system.

### 2. Curriculum infrastructure exists, but syllabus coverage is not lesson coverage

The repository contains a curriculum registry, versioned subject datasets, knowledge extraction/grounding, ingestion tooling, and a prior all-board audit at `docs/curriculum/ALL_BOARDS_SYLLABUS_AUDIT_2026-10-21.md`.

The audit itself flags version-bound datasets, source-document state conflicts, partial extraction, and incomplete coverage evidence for some subjects. Therefore:
- A board/subject appearing in a selector or registry must not be advertised as fully covered by lessons.
- A syllabus objective or knowledge row must not be counted as a published, reviewed lesson unless a student-facing asset is actually linked to it.
- Exam-year and syllabus-version identity must survive from curriculum source through learning asset and retrieval.

### 3. Offline curriculum support is a foundation, not proof of a preloaded library

`src/lib/cortex/offlineCurriculumPack.ts` defines browser-local storage for versioned curriculum packs containing objectives and knowledge items. This can support low-data and offline grounding, but it does not prove that complete lessons, worked examples, diagrams, graph tasks, practice questions, answers, and mark-scheme-aligned explanations are preloaded for every topic.

Offline support should cache intentionally selected assets and metadata, not attempt to bundle every subject into the initial app download.

### 4. Classic mode must remain a real learning product

The learning-mode toggle is a useful control, but the product contract should be:
- **Classic:** curated/published library, saved content, deterministic practice and calculations, progress, rule-based revision, and recommendations from existing learner evidence. It must not require generative AI to access a lesson that already exists.
- **Cortex AI:** the same library and learning capabilities, with optional AI explanations, adaptations, and generation.
- A missing library asset should produce an honest gap state and a way to continue, not a fake claim that the topic is already available or a silent dependency on AI.

The toggle alone does not create content. Server routes must continue to enforce mode independently of UI state, and every AI-capable caller must be audited for correct mode propagation.

## Architectural gap

The present library is best described as a **shared, usage-fed lesson cache/library**, not yet a **versioned, syllabus-complete, prepublished content catalogue**.

The target should be a layered system:

1. **Curriculum catalogue:** board, qualification, level, subject, syllabus version, topic/objective IDs, source references, effective exam years and verification status.
2. **Published learning assets:** student-facing lessons, explanations, worked examples, diagrams, graph/experiment tasks, practice sets, answers and mark-scheme reasoning. Each asset links to the curriculum identity it covers.
3. **Asset quality and provenance:** author/reviewer, evidence/source, review state, last verified date, content version, known limitations and accessibility/low-data metadata.
4. **Retrieval and reuse:** exact curriculum identity first, then topic/objective mapping and subject-safe semantic/lexical retrieval. Never substitute a merely similar lesson as if it were an exact syllabus match.
5. **Learner state:** progress, mistakes, retention, mastery and next actions remain separate from the canonical content asset.
6. **Offline packs:** explicit subject/topic downloads with asset manifests, checksums/versioning, storage estimates, resumable downloads, and clear stale-content handling.
7. **Optional AI:** fills genuine gaps or personalizes teaching; it is not the database of record for curriculum coverage.


## Read-only production inventory (2026-10-26)

The active Supabase project `shadecode-student` was queried read-only. These are actual row counts at audit time, not estimates:

| Production table | Rows | What this does and does not tell us |
|---|---:|---|
| `lesson_library` | 25 | Shared reusable lessons currently available through the library table. |
| `learn_lessons` | 130 | Learner lesson records, including records not necessarily eligible for publication. |
| `curriculum_objectives` | 1,380 | Structured curriculum objectives, not 1,380 finished lessons. |
| `curriculum_knowledge` | 1,708 | Structured knowledge records, not necessarily complete student-facing lessons. |
| `curriculum_versions` | 9 | Versioned curriculum records, with mixed verification states. |
| `curriculum_documents` | 9 | Source-document records; count alone does not imply complete extraction or approval. |
| `past_papers` | 58 | Paper records; count alone does not establish complete paper availability or rights for every syllabus. |

### Current shared lesson library by subject

| Subject label | Shared lessons | Lessons with at least 8 blocks |
|---|---:|---:|
| Computer Science | 8 | 5 |
| Physics | 7 | 3 |
| Mathematics | 6 | 2 |
| Biology | 3 | 0 |
| Accounting | 1 | 1 |
| **Total** | **25** | **11** |

This is a small shared catalogue, and the block count is only a rough structural indicator, not a quality or syllabus-coverage score. No exact board/version mapping is established by this aggregate.

### Curriculum versions returned by production

| Board | Qualification / syllabus | Version | Status | Objectives | Knowledge rows |
|---|---|---|---|---:|---:|
| Cambridge | AS & A Level Biology 9700 | 2025-2027 | verified | 259 | 278 |
| Cambridge | AS & A Level Chemistry 9701 | 2025-2027 | verified | 388 | 606 |
| Cambridge | IGCSE Computer Science 0478 | 2026-2028 | verified | 68 | 75 |
| Cambridge | AS & A Level Mathematics 9709 | 2026-2027 | verified | 159 | 235 |
| Cambridge | AS & A Level Physics 9702 | 2025-2027 | verified | 325 | 514 |
| Cambridge | IGCSE Computer Science 0984 | 2026-2028 | draft | 10 | 0 |
| Cambridge | O Level Computer Science 2210 | 2026-2028 | draft | 10 | 0 |
| Cambridge | AS & A Level Computer Science 9618 | 2027-2029 | draft | 20 | 0 |
| ZIMSEC | O Level Computer Science 4021 | 2024-2030 | draft | 141 | 0 |

Important: these are database status values and row counts, not independent proof that the source evidence is complete. The prior repository audit notes evidence-state conflicts for some Cambridge packs. Do not interpret a `verified` status label as proof that complete reviewed lessons exist for all objectives.

### What this proves

- The gap is not simply “no curriculum data”: there are thousands of curriculum objective/knowledge records.
- The key gap is the **conversion and publication of those records into reviewed, student-facing learning assets**, linked to exact curriculum identity.
- The current shared library has 25 lessons across five subject labels. Only 11 have at least eight blocks, and block count does not establish quality.
- A useful next step is a traceable content pipeline from verified objective → authored/reviewed lesson asset → practice and exam components → offline pack, with coverage reports that measure actual published assets.

## Execution sequence

### P0: Establish a trustworthy inventory
- Query production for counts and distinct coverage of `lesson_library`, `learn_lessons`, curriculum objectives, and curriculum knowledge, grouped by board/version/qualification/subject/topic where those fields exist.
- Inspect the actual production schema before designing migrations; do not assume migration files prove every migration was applied.
- Produce a coverage matrix separating: syllabus objectives present, student-facing assets present, assets reviewed, exam components present, and offline-ready assets.
- Identify which subject/topic combinations can be served without AI today.

### P1: Design the canonical published-asset contract
- Add an additive, backward-compatible schema for explicit curriculum identity, asset type, version, provenance, review/publish state, and component metadata.
- Keep the existing learner-generated/shared library usable during migration.
- Make publication explicit and quality-gated. Learner progress may nominate content for review, but should not automatically imply academic correctness or publication approval.
- Add idempotent migration and reconciliation scripts, plus tests for duplicates and missing curriculum links.

### P2: Publish a small, genuinely useful first catalogue
- Choose a bounded initial slice based on verified curriculum evidence and actual learner demand.
- Publish real, checked content, not empty topic shells or lessons fabricated from topic names.
- Each topic pack should include appropriate components: explanation, worked example, diagram/graph/experiment where the subject requires it, practice, answers, and exam-style application.
- Validate the content against authoritative sources and record the exact syllabus version.
- Expand board-by-board only as evidence and review capacity allow.

### P3: Make retrieval and Classic mode dependable
- Search published assets first, using exact curriculum identifiers when available.
- Distinguish exact matches, partial supporting material, and missing assets in API responses.
- Keep strict subject authorization and do not leak another learner's private progress.
- Test Classic mode through lesson discovery, lesson reading, practice, saved progress, revision recommendations, offline reload, and provider-outage conditions.

### P4: Build low-data/offline packs
- Let learners choose a subject or topic to download.
- Cache the selected published assets and metadata locally, not just the curriculum prompt context.
- Include version/checksum, storage estimate, download progress, cancellation/resume, and safe update behavior.
- Keep first-load size small; downloading is explicit and granular.

## Acceptance criteria

- A new learner can open a published lesson without first generating it or waiting for another learner to use it.
- Every asset advertised as syllabus-aligned has an explicit board/qualification/version/topic identity and traceable evidence.
- Coverage reports count reviewed student-facing assets separately from syllabus objectives and raw knowledge rows.
- Classic mode can use already-published content with AI providers unavailable.
- A missing asset is reported honestly and never replaced with a false claim of exact coverage.
- Offline downloads contain the selected learning assets and remain usable after reload without network access.
- Tests cover curriculum matching, subject access, publication state, stale/offline assets, and AI-disabled operation.

## Immediate next action

Perform a read-only production inventory and schema reconciliation, then use that evidence to choose the first publishable subject/topic slice. Do not bulk-generate the entire syllabus, create placeholder lessons, or claim broad coverage before the inventory and review gates are complete.
