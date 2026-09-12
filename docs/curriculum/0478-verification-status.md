# Cambridge IGCSE Computer Science 0478 — verification status (2026-09-12)

This documents a concrete, evidenced check against Cambridge 0478 done this session, for
whoever picks up `curriculum/0478-verification-main` or the broader official-ingestion
pipeline next. It is a status report, not a database write — nothing described here has
been promoted to `verified` in `curriculum_versions` or `curriculum_coverage_checks`.
That's intentional: this is exactly the kind of multi-document reconciliation the
verification system is designed to require a deliberate human/pipeline decision for, not
something to complete unilaterally mid-session.

## What was independently confirmed

The full official syllabus PDF was fetched directly from Cambridge International
(`https://www.cambridgeinternational.org/Images/697167-2026-2028-syllabus.pdf` — this
domain, unlike ZIMSEC's, does not block automated fetching).

**The 10 top-level objectives already in `curriculum_objectives` for this version
(`487fd8a8-06c7-4744-b816-c1e1dc7bc819`) match the official syllabus's Content Overview
exactly** — same 10 topic names, same order (Data representation, Data transmission,
Hardware, Software, The internet and its uses, Automated and emerging technologies,
Algorithm design and problem-solving, Programming, Databases, Boolean logic). These are
genuinely verified, not just draft-and-plausible.

Note: these are the 10 topic-level objectives only. The real syllabus contains a much
larger set of granular numbered learning outcomes under each topic (e.g. topic 1 alone
has sub-sections 1.1–1.3 with ~10 individually numbered outcomes). If finer-grained
objectives are wanted for mapping/practice generation, that's a real, larger authoring
task, not a quick follow-up.

## A real discrepancy found: cached document is one version behind

`curriculum_documents` (row `4cd4b3c5-3de1-4a3c-b823-8532706f1b59`) has
`structure.version: 5` cached from ingestion. The live PDF's own changelog states:

> "This is version 6, published September 2026."

Version 6's only change (per the syllabus's own changelog) is a wording update to the
ROUND function description on page 41 — low-stakes, but the cached snapshot should be
refreshed and the `content_hash` recomputed before anything is promoted to `verified`,
since the whole point of hash-tracked provenance is catching exactly this kind of drift.

## Coverage dimension gap — precise breakdown

`curriculum_coverage_checks` has 29 rows for this version, only 2 `verified`
(`identity`, `objectives`). Of the remaining 27:

**~23 are verifiable directly from the syllabus PDF already fetched** (not yet done,
but the source material is in hand): `source`, `document`, `structure`, `scope`,
`content_scope`, `competencies`, `skills`, `prerequisites` (syllabus explicitly
recommends "a broad curriculum such as the Cambridge Lower Secondary programme"),
`progression`, `assessment_objectives` (AO1/AO2/AO3 with explicit weightings),
`assessment_structure`, `paper_components`, `assessment_weightings`,
`examination_format`, `practical_requirements` (syllabus explicitly requires practical
programming exercises), `terminology`, `constraints`, `guidance`, `resources`,
`change_history` (full version-by-version changelog is in the document), `provenance`.

**2 can honestly be marked `not_applicable`**, not left missing:
`project_requirements` and `coursework_requirements` — the syllabus explicitly states
assessment is two written papers only, no coursework or project component. The
completeness evaluator treats `not_applicable` as satisfying (see
`src/lib/curriculum/completeness.ts`), so this is the correct status, not a shortcut.

**4 genuinely need separate documents, not just the syllabus PDF**:
`past_paper_coverage`, `mark_scheme_coverage`, `examiner_report_coverage`,
`grade_threshold_coverage`. These aren't unreachable, though — while checking, public
URLs for some were found via search (not yet fetched or verified in full):

- Specimen mark schemes: `595596-2023-specimen-paper-1a-mark-scheme.pdf`,
  `675878-2023-specimen-paper-1b-mark-scheme.pdf`,
  `675879-2023-specimen-paper-2b-mark-scheme.pdf` (all under
  `cambridgeinternational.org/Images/`)
- Grade thresholds: `758457-computer-science-0478-march-2026-grade-threshold-table.pdf`,
  `762825-computer-science-0478-june-2026-grade-threshold-table.pdf`

Caveat: specimen papers/mark schemes are Cambridge's own example materials, not the same
evidentiary category as genuine past-exam papers or examiner reports from real sat
series (those are typically behind the School Support Hub login and weren't checked).
Whether specimen material is sufficient evidence for `mark_scheme_coverage` is a policy
call for whoever owns this gate, not something to decide by default.

## Knowledge layer: still empty

`curriculum_knowledge` has 0 rows for every syllabus in production, not just this one.
The 15 required kinds (`src/lib/curriculum/resolver.ts` `REQUIRED_KNOWLEDGE_KINDS`) are
entirely unpopulated. Even with every coverage dimension above resolved, the version
still won't reach `resolved` status in `resolveCurriculumContext` until knowledge exists
for all 15 kinds. This is the largest remaining piece of work, independent of the
coverage-dimension gap above.

## Suggested order of work

1. Refresh the cached `curriculum_documents` snapshot to version 6.
2. Populate the ~23 syllabus-derivable coverage dimensions and mark the 2
   not-applicable ones — all achievable from the document already fetched.
3. Decide the specimen-vs-genuine-past-paper policy question above.
4. Populate `curriculum_knowledge` across the 15 required kinds — the real bottleneck,
   and worth scoping as its own dedicated effort rather than folding into a quick pass.
