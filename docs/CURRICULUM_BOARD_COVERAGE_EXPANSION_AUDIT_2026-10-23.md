# Examination-board coverage and expansion audit

**Audit date:** 2026-10-23  
**Status:** Read-only repository and live-schema/data audit. Learner-visible coverage and source readiness still require end-to-end verification.

## Purpose

Respond to the market limitation that Shadecode Student currently presents a narrow examination-board footprint. Expand coverage without weakening syllabus accuracy, lesson reliability, subject eligibility, or trust.

## Verified current position

- The repository README positions Shadecode Student around Cambridge and ZIMSEC learners.
- The master roadmap marks both Cambridge and ZIMSEC as partial, with coverage still expanding.
- The capability registry lists “Cambridge/ZIMSEC curriculum” as partial, not complete.
- Curriculum infrastructure models board, qualification, subject, syllabus ID/version, source documents, coverage checks, objectives, and readiness.
- The active Shadecode Student Supabase project was queried read-only on 2026-10-23. Its curriculum tables currently contain **9 syllabus-version records across 2 board IDs**:
  - **Cambridge:** 8 syllabus-version records, 5 stored as `verified` and 3 as `draft`.
  - **ZIMSEC:** 1 syllabus-version record, stored as `draft`.
- Stored version status is not equivalent to passing the repository's conservative readiness gate. A read-only SQL check applying the gate's key requirements found **all 9 records still have readiness blockers**. This is a diagnostic result, not a status change or an independent syllabus-content review.
- Recorded curriculum objectives total 1,380 across these records, all currently marked `verified`. This does **not** establish that all required coverage dimensions, source extraction, whole-syllabus review evidence, assessment formats, past papers, mark schemes, or learner-facing workflows are complete.
- The current database therefore confirms two board IDs, but does not support a claim that every Cambridge or ZIMSEC subject is production-ready. No third board is present in these curriculum-version records.

## Current record inventory

| Board | Qualification / subject examples | Stored version status | Audit interpretation |
|---|---|---|---|
| Cambridge | AS/A Level Biology 9700 (2025–2027) | Verified | Still fails at least one readiness-gate requirement; the document extraction status is recorded as manual. |
| Cambridge | AS/A Level Chemistry 9701 (2025–2027) | Verified | No coverage-check rows recorded; stored status alone is insufficient. |
| Cambridge | AS/A Level Mathematics 9709 (2026–2027) | Verified | Coverage checks exist but are not complete; verify the remaining blockers. |
| Cambridge | AS/A Level Physics 9702 (2025–2027) | Verified | Coverage checks exist but are not complete; verify the remaining blockers. |
| Cambridge | IGCSE Computer Science 0478 (2026–2028) | Verified | Some coverage dimensions remain incomplete; verify the remaining blockers. |
| Cambridge | AS/A Level Computer Science 9618 (2027–2029) | Draft | Many coverage dimensions are recorded as missing. |
| Cambridge | IGCSE 9–1 Computer Science 0984 (2026–2028) | Draft | Many coverage dimensions are recorded as missing. |
| Cambridge | O Level Computer Science 2210 (2026–2028) | Draft | Many coverage dimensions are recorded as missing. |
| ZIMSEC | O Level Computer Science 4021 (2024–2030) | Draft | Many coverage dimensions are recorded as missing. |

This is a snapshot of database metadata, not an endorsement of syllabus completeness. The qualification/subject records above are the current rows found by the audit; this table should be regenerated after curriculum changes.

## Immediate audit procedure

Run the existing read-only readiness report against the intended Supabase environment:

```bash
npm run report:curriculum-readiness
```

Required environment variables are `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY`. Use the service key only in a trusted local/CI environment; never expose it in the browser or commit it. The report's disclaimer is important: readiness status does not independently prove syllabus correctness.

For every returned board/qualification/subject/version, inspect:
- official source authority and exact syllabus/version;
- extraction success and retained source text;
- all expected coverage dimensions and blockers;
- objective verification ratio;
- question, paper, mark-scheme and topic mapping coverage;
- whether the matching subject is actually selectable and usable in the app;
- whether Learn and Exam Simulation enforce the learner's selected board, qualification, level and subjects;
- whether unsupported or unverified content is clearly withheld instead of being presented as authoritative.

## Expansion policy

### Phase 1: make current coverage honest and reliable

1. Run and preserve the full JSON output of `npm run report:curriculum-readiness` in a trusted environment; the live query above was a focused diagnostic, not a substitute for the report's full blocker explanations.
2. Fix the blockers in the strongest current curriculum candidates before adding a new board. Biology, Mathematics, Physics and IGCSE Computer Science 0478 have records stored as verified, but must still pass the readiness gate and app workflow checks.
3. Complete the coverage inventory for every qualification/level/subject/syllabus version.
4. Compare the inventory with the curriculum picker and the actual Learn, Exam Hub and Exam Simulation routes.
5. Fix mismatches between “listed”, “ingested”, “verified”, and “usable”.
6. Preserve subject eligibility: a learner must not receive a subject or topic merely because another learner has it or because a generated lesson exists.

### Phase 2: add one board through a repeatable adapter

Treat Pearson Edexcel International GCSE/International A Level as a **candidate to evaluate**, not as an already-supported board. Confirm demand, authoritative syllabus access, syllabus-year/version scope, question/mark-scheme licensing and provenance, and implementation effort before committing to it. Other boards should be prioritized from real learner demand and source feasibility, not from a desire to inflate a marketing number.

The shared curriculum contract should continue to identify at least:
- board ID;
- qualification and level;
- subject ID;
- syllabus ID and version;
- authoritative source and retrieval/provenance;
- verified objective/topic mapping;
- assessment components and marks/durations where applicable;
- readiness status and explicit blockers.

Do not create a separate learning engine per board. Reuse the existing curriculum-aware Learn, assessment, evidence and Cortex paths, with board-specific adapters only where semantics genuinely differ.

### Phase 3: validate learner-visible behavior

A board is not “supported” merely because its name appears in a dropdown or rows exist in the database. For each release candidate, test:
- selecting the correct board, qualification, level and subject;
- syllabus/topic navigation against the verified version;
- lesson generation and safe recovery when a provider fails;
- retrieval of reusable shared lessons only when curriculum identifiers, version, quality and access eligibility match;
- question/past-paper provenance and correct topic mapping;
- exam timing, scoring and mark-scheme behavior for the supported paper format;
- isolation between learners and no leakage of personal progress;
- unsupported syllabus versions fail closed with a clear message;
- offline behavior where the feature is advertised as available offline.

## Release gate

A board/subject/version can be called **supported** only when all are true:

1. Official source and syllabus version are recorded.
2. Required source text is extracted and retained with provenance.
3. Coverage checks meet the declared policy; critical assessment structures are verified.
4. Topic/objective mapping is verified rather than inferred from generated titles.
5. Subject eligibility and access controls are enforced.
6. At least one representative Learn flow and one relevant assessment flow pass tests for that board/qualification.
7. Lesson generation failure and recovery are tested without losing progress or duplicating evidence.
8. UI copy and public marketing accurately reflect the verified coverage.

If only some subjects pass, publish subject-level coverage and label the rest as in progress. Do not imply full-board coverage from a partial subset.

## Measures

Track these separately:
- verified board count;
- verified qualification/level count;
- verified subject and syllabus-version count;
- percentage of required coverage checks passing;
- verified objective count / total objective count;
- topic-mapped question and mark-scheme coverage;
- Learn and assessment end-to-end pass rate;
- lesson-generation completion/recovery rate by board;
- student demand and repeat use by board.

Board count is a reach metric, not a quality metric. Accuracy, usable coverage and reliable learning workflows are the release criteria.

## Scope boundaries

- This document does not declare a new board supported.
- It does not promote curriculum versions or change production database rows.
- It does not create a parallel curriculum schema or AI engine.
- Existing Cortex and lesson-generation reliability work remains a release priority alongside coverage expansion.
