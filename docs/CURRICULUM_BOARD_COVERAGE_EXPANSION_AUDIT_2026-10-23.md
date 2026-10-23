# Examination-board coverage and expansion audit

**Audit date:** 2026-10-23  
**Status:** Repository/documentation audit; runtime coverage still requires a generated readiness report and learner-facing verification.

## Purpose

Respond to the market limitation that Shadecode Student currently presents a narrow examination-board footprint. Expand coverage without weakening syllabus accuracy, lesson reliability, subject eligibility, or trust.

## Verified current position

- The repository README positions Shadecode Student around Cambridge and ZIMSEC learners.
- The master roadmap marks both Cambridge and ZIMSEC as partial, with coverage still expanding.
- The capability registry lists “Cambridge/ZIMSEC curriculum” as partial, not complete.
- Curriculum infrastructure already models board, qualification, level, syllabus ID, subject ID, syllabus version, source authority, source documents, coverage checks, objectives, and readiness. The readiness-report script reads those records and reports blockers without promoting curriculum versions.
- The repository includes curriculum ingestion, source-change detection, and a readiness report. This is a useful foundation for more boards, but infrastructure for a board is not proof that its subjects are ready for students.
- The exact count of production-ready boards and subjects is **not established by this source audit**. Do not publish a precise coverage count until the readiness report and live product are checked.

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

1. Produce a board → qualification → level → subject → syllabus-version inventory from the readiness report.
2. Compare the inventory with the curriculum picker and the actual Learn, Exam Hub and Exam Simulation routes.
3. Fix mismatches between “listed”, “ingested”, “verified”, and “usable”.
4. Keep Cambridge and ZIMSEC marked partial until the relevant subjects and user workflows pass the gates below.
5. Preserve subject eligibility: a learner must not receive a subject or topic merely because another learner has it or because a generated lesson exists.

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
