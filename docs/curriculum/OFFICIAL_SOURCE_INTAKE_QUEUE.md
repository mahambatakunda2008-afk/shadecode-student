# Official syllabus source intake queue

Updated: 2026-10-21

This queue is the working inventory for syllabus ingestion across exam boards and education stages. It includes an initial set of authoritative source targets, prioritised for the current learner base and future coverage. It is deliberately not a claim that these syllabuses have been ingested or are available in production.

## First ingestion batch

1. Cambridge AS & A Level Biology 9700, 2028-2030
2. Cambridge AS & A Level Chemistry 9701, 2028-2030
3. Cambridge AS & A Level Physics 9702, 2028-2030
4. Cambridge AS & A Level Mathematics 9709, 2028-2030
5. ZIMSEC Infant syllabus sources (the official catalogue lists six subject areas) and the wider primary subject/grade inventory
6. ZIMSEC O Level Computer Science 4021 official-source retrieval and reconciliation

Cambridge's official subject pages expose the new 2028-2030 PDFs. Their exact source URLs are recorded in `official-source-intake-queue.json`. Existing 2025-2027/2026-2027 datasets must remain immutable, version-bound packs. Never duplicate an older pack and simply rename its syllabus year.

## Existing versions that must remain supported

The queue also tracks the currently needed editions already present in the repository or production database. These are reconciliation tasks, not permission to replace them with newer editions:

- Cambridge 9700 Biology, 2025-2027
- Cambridge 9701 Chemistry, 2025-2027
- Cambridge 9702 Physics, 2025-2027
- Cambridge 9709 Mathematics, 2026-2027
- Cambridge 9618 Computer Science, 2027-2029
- Cambridge IGCSE Computer Science 0478, 2026-2028
- ZIMSEC O Level Computer Science 4021, 2024-2030

Students preparing for 2026 and 2027 exams must retain their applicable edition while later editions are prepared. Some existing packs carry incomplete or conflicting provenance/coverage evidence. Keep them versioned and explicitly gated rather than deleting them or treating a `verified` flag as sufficient by itself.

## Cross-board expansion

After the first batch, inventory exact subject/specification codes and effective exam years for Pearson Edexcel, IB MYP/DP, AQA, OCR, and WAEC. Expand ZIMSEC coverage beyond Computer Science, including Infant and Grades 1-7 primary where official subject/grade documents exist, then O Level and A Level. Include Cambridge Primary and Lower Secondary as stage-specific curriculum frameworks. For WAEC, separate country/exam-specific requirements rather than treating the whole region as a single specification.

## Rules that protect students

- A board selector entry is not syllabus coverage.
- An official catalogue page is not an exact syllabus document.
- A PDF file is not a normalized, complete syllabus pack.
- A normalized pack is not verified until its version, source hash, objectives, scope, assessment structure, and required syllabus coverage evidence reconcile.
- Exam-history claims are separate. Past-paper, mark-scheme, examiner-report, and grade-threshold coverage cannot be inferred from a syllabus PDF.
- Store source URLs, retrieval time, content hash, page count, extraction engine/version, source-version evidence, and review provenance.
- Keep uncertain or inferred content separate from verified exam-required objectives.
- Preserve the exact original source and version; never overwrite historical syllabus packs in place.
- Do not ingest restricted IB materials without confirming lawful access and permitted use.

## Validation

Run:

```sh
node scripts/validate-curriculum-intake-queue.mjs
```

This validates metadata consistency only. It does not certify content completeness, official-source availability, or production readiness.

## Current limits

The official ZIMSEC syllabus catalogue currently surfaces Infant subject areas including English Language, Information and Communication Technology, Indigenous Languages, Heritage and Social Studies, Mass Displays, and Mathematics and Science. This is catalogue-level discovery only, not a complete Grades 1-7 inventory or proof that the underlying PDFs have been captured. The initial queue is a finite starting inventory, not an exhaustive list of every qualification offered by every awarding body. The next research pass must enumerate subjects and levels from each authority's official catalogue, identify the exact specification document/version, then add one item per qualification/version. The queue must grow from evidence, not guessed completeness.
