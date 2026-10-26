# Published learning library coverage baseline

**Baseline date:** 2026-10-26  
**Source:** Read-only queries against the active Supabase project.  
**Purpose:** Distinguish syllabus metadata from actual learner-ready, reviewed content.

## Executive result

The canonical `published_learning_assets` table exists, but it contains **zero published assets**. This is the correct honest state: the app must not imply that a topic is preloaded merely because curriculum metadata exists.

The database currently has 9 curriculum versions, 5 marked `verified` and 4 marked `draft`. All nine currently have zero published canonical assets. The five verified versions contain 1,199 curriculum objective rows and 1,708 curriculum knowledge rows in total. Those rows are syllabus mapping and learning outcomes, not finished lessons.

| Board / syllabus | Version | Status | Objectives | Knowledge rows | Published assets |
|---|---|---:|---:|---:|---:|
| Cambridge AS & A Level Biology 9700 | 2025–2027 | verified | 259 | 278 | 0 |
| Cambridge AS & A Level Chemistry 9701 | 2025–2027 | verified | 388 | 606 | 0 |
| Cambridge IGCSE Computer Science 0478 | 2026–2028 | verified | 68 | 75 | 0 |
| Cambridge AS & A Level Mathematics 9709 | 2026–2027 | verified | 159 | 235 | 0 |
| Cambridge AS & A Level Physics 9702 | 2025–2027 | verified | 325 | 514 | 0 |
| Cambridge O Level Computer Science 2210 | 2026–2028 | draft | 10 | 0 | 0 |
| Cambridge IGCSE Computer Science 0984 | 2026–2028 | draft | 10 | 0 | 0 |
| Cambridge AS & A Level Computer Science 9618 | 2027–2029 | draft | 20 | 0 | 0 |
| ZIMSEC O Level Computer Science 4021 | 2024–2030 | draft | 141 | 0 | 0 |

Counts are database row counts, not a percentage-complete score. The same curriculum objective can be associated with multiple knowledge rows. A version's `verified` label also does not prove every possible teaching asset has been authored.

## Legacy shared library

The existing `lesson_library` contains 25 shared lesson records:

| Legacy subject label | Records |
|---|---:|
| Computer Science | 8 |
| Physics | 7 |
| Mathematics | 6 |
| Biology | 3 |
| Accounting | 1 |

Quality and mapping warnings:
- 23 of 25 records have a null `topic`.
- There are two records titled `Packet Switching` and two titled `Terminal Velocity`. Same title does not prove identical content or that either is the better version.
- `Advanced Trigonometry for A-Level` is labelled Computer Science even though its search text describes mathematics and computer science. It needs subject and qualification review.
- The records link to source `learn_lessons` rows, but that does not establish an official syllabus mapping or review status.
- One Physics record titled `Waves: describing, measuring, and explaining wave motion` has topic `Waves` and 20 blocks, making it a useful candidate for inspection. It is **not** automatically approved for Cambridge 9702.

Do not bulk-copy these records into `published_learning_assets`. Candidate reuse requires checking the complete blocks, factual correctness, source/provenance, exact board/qualification/version, topic key, objective mapping, assessment components, duplicates, and mobile/low-data usability.

## Initial authoring target

Start with a **small Cambridge AS Physics 9702 asset pack**, because its 2025–2027 curriculum version has verified syllabus-derived knowledge rows and official source references. A sensible pilot topic is Physical quantities and units, but only after mapping the exact objective keys and inspecting relevant source rows.

The first pack should include more than prose:
- a clear concept explanation and definitions,
- worked examples with units and reasoning,
- active-recall questions and mark-point answers,
- uncertainty or unit-conversion practice where relevant,
- a visual task when the syllabus outcome genuinely calls for one,
- common errors and a short retrieval check.

Do not force a diagram or graph into every lesson. Include assessment components that fit the syllabus objective. Do not label the pack complete until a reviewer has inspected it.

## Repeatable report

The companion SQL file `docs/architecture/sql/published_learning_coverage.sql` gives current counts by curriculum version and topic-level coverage gaps. Run it after publishing batches to see whether the new assets actually close gaps.
