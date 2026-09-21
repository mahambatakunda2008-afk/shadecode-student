# Cambridge International AS & A Level Physics 9702 (2025-2027): ingestion record

Loaded 2026-09-20, after Mathematics 9709 (same method; see `cambridge-mathematics-9709.md`). Chosen because
Physics is the second most-selected subject among learners who declared subjects (4 learners; two explicitly
Cambridge International with code 9702).

## Source
- Official PDF: `https://www.cambridgeinternational.org/Images/664565-2025-2027-syllabus.pdf`
- Edition: **Version 1, published September 2022**; valid for exams in **2025, 2026 and 2027** (June and November
  series; March series in India). Its own change note lists wording updates to outcomes 3.3.3, 7.5.2, 15.3.4, 25.3.1.
- Read in full via web fetch on 2026-09-20. PDF byte hash not computed (placeholder
  `not-computed:web-fetch-2026-09-20`), as for 9709.

## Identity
`cambridge` / `cambridge-as-a-level` / `cambridge-9702` / `2025-2027` / `physics`, effective 2025-01-01 to 2027-12-31.

## What is loaded (production, project `zczdtffwzkctkxwmvalb`)
- `curriculum_sources` `cambridge-9702-2025-2027` (**inactive**), `curriculum_documents` (draft, 67 pages, structure with
  the five assessment papers), `curriculum_versions` `a90d1b2c-4a7e-4122-8509-881ab7561b9e` (`verified`,
  `wholeSyllabusVerified: false`).
- `curriculum_objectives`: **325 rows, all `verified`**: 25 topic rows (`1`..`25`), 76 numbered subsections and
  300 numbered learning outcomes keyed by **Cambridge's own numbering** (`3.3.3`, `7.5.2`, ...). Topics 1-11 are AS Level
  (`as_level`), topics 12-25 are A Level only (`a_level`). Outcome sentence in `description`; subsection title in
  `title`; subsection number in `topic`; `paper_component` empty, paper in `provenance.paper`.
- `curriculum_coverage_checks`: 14 of 29 satisfied with page-referenced evidence: identity, source, objectives,
  prerequisites, progression, assessment_objectives, assessment_structure, paper_components, assessment_weightings,
  examination_format, change_history, **practical_requirements** (section 5: Papers 3 and 5), and `not_applicable` for
  project_requirements and coursework_requirements (timetabled papers only).

| Topics | Level | Subsections | Outcomes |
|---|---|---|---|
| 1-11 (Physical quantities ... Particle physics) | AS and A Level | 32 | 145 |
| 12-25 (Motion in a circle ... Astronomy and cosmology) | A Level only | 44 | 155 |

## Verification evidence
- Dataset `src/lib/curriculum/data/cambridge-9702-2025-2027.json`, asserted at build time against the official topic
  names (Content overview p. 10) and per-subsection outcome counts. `cambridge-9702.test.ts` re-checks structure, level
  split, the syllabus's own outcome citations, and pins the row checksum.
- Database rows match the repository dataset by md5 **`9fe5528df59f72e795dcbd6fb7fe2ff8`** (325 rows).
- Read the official Content overview before writing: it lists **25** topics (not the 27 recalled from memory).

## Not done
- The **practical assessment** (Papers 3 and 5) is documented as a coverage dimension but not modelled as objectives.
- **11 syllabus coverage dimensions** for the `syllabus` tier (document, structure, scope, content_scope, competencies,
  skills, terminology, constraints, guidance, resources, provenance; all evidenced by the same PDF) and the whole
  knowledge layer (see the 0478 package for the target shape). The four exam-history dimensions are not needed for
  teaching (`coverage-evidence-policy.md`).
- Source monitoring is off, and no learner has a stored identity (`identity-gap.md`).
