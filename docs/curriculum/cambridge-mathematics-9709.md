# Cambridge International AS & A Level Mathematics 9709 (2026-2027): ingestion record

Loaded 2026-09-20. This is the first non-Computer-Science subject with objective-level curriculum.
Chosen because Mathematics is the most-selected subject among learners who have declared one, and
most of those learners are A Level (two explicitly Cambridge International, with codes 9709/9702/9618).

## Source
- Official PDF: `https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf`
- Edition: **Version 4, published December 2025**; valid for exams in **2026 and 2027** (June and November series).
  (Not 2026-2028 like Computer Science: this syllabus has a two-year window.)
- Read in full via web fetch on 2026-09-20. The PDF's byte hash could **not** be computed (the sandbox
  cannot download from cambridgeinternational.org), so `document_hash` / `content_hash` hold the
  placeholder `not-computed:web-fetch-2026-09-20`.

## Identity (what the resolver matches on)
| field | value |
|---|---|
| `board_id` | `cambridge` |
| `qualification_id` | `cambridge-as-a-level` |
| `syllabus_id` | `cambridge-9709` |
| `syllabus_version` | `2026-2027` |
| `subject_id` | `mathematics` |
| effective | 2026-01-01 to 2027-12-31 |

Learner `level` is not stored on versions (see "Schema notes"); `as_level` and `a_level` learners both use this version.

## What is loaded (production, project `zczdtffwzkctkxwmvalb`)
- `curriculum_sources` `cambridge-9709-2026-2027`: **inactive** on purpose (see "Not done").
- `curriculum_documents` (`draft`, 61 pages, structure = sections, 38 topics, 6 assessment papers).
- `curriculum_versions` `1e7b2f21-da90-40f3-8200-614cb87c130f`: `verified`, `wholeSyllabusVerified: false`.
- `curriculum_objectives`: **159 rows, all `verified`**: 6 content sections (`1`..`6`, one per component/paper),
  38 topics, 153 numbered learning outcomes (`1.1.1`, `1.1.2`, ...). Outcome sentence in `description`
  (this is what grounding uses as the statement), topic title in `title`, topic number in `topic`,
  section in `parent_key`. `paper_component` is deliberately empty (see below); the paper is in `provenance.paper`.
- `curriculum_coverage_checks`: 13 of 29 dimensions satisfied, each with page-referenced evidence:
  identity, source, objectives, prerequisites, progression, assessment_objectives, assessment_structure,
  paper_components, assessment_weightings, examination_format, change_history, and `not_applicable` for
  project_requirements and coursework_requirements (all components are written exams).

| Section | Paper | Available | Topics | Outcomes |
|---|---|---|---|---|
| 1 Pure Mathematics 1 | 1 | AS and A Level | 8 | 34 |
| 2 Pure Mathematics 2 | 2 | AS only | 6 | 18 |
| 3 Pure Mathematics 3 | 3 | A Level only | 9 | 41 |
| 4 Mechanics | 4 | AS and A Level | 5 | 22 |
| 5 Probability & Statistics 1 | 5 | AS and A Level | 5 | 17 |
| 6 Probability & Statistics 2 | 6 | A Level only | 5 | 21 |

## Verification evidence
- The dataset (`src/lib/curriculum/data/cambridge-9709-2026-2027.json`) was built from the fetched text and
  asserted against an independent transcription of the official Content overview (p. 9) and the per-topic
  bullet counts in Subject content (pp. 19-39). `cambridge-9709.test.ts` re-checks this on every run.
- The rows loaded into the database have canonical md5 **`f1f91d6df19e5b271c23eb9850bdab3e`**, identical to the
  repository dataset (the test asserts the same constant). Compare with:
  `select md5(string_agg(objective_key||'|'||coalesce(parent_key,'')||'|'||coalesce(topic,'')||'|'||title||'|'||description||'|'||education_level, E'\n' order by string_to_array(objective_key,'.')::int[])) from curriculum_objectives where curriculum_version_id = '1e7b2f21-da90-40f3-8200-614cb87c130f';`
- Outcome statements are **concise restatements in our own words** of the official bullets, keeping the
  official terminology and the syllabus's stated scope exclusions ("X is not required"), so teaching does
  not expand beyond the syllabus. Never add content that is not in the official document.

## Not done (so this subject is NOT yet resolvable)
`resolveCurriculumContext` / `resolveSystemCurriculum` are fully fail-closed: they need **all 29 coverage
dimensions** verified or not applicable **and** verified `curriculum_knowledge` covering **all 15 kinds**.
No subject meets that today (Computer Science 0478 is at 2/29 and 0 knowledge rows). For 9709:
1. **16 coverage dimensions remain.** Several are evidenced by the same PDF and can be added the same way
   (document, structure, scope, content_scope, competencies, skills, terminology from the command words p. 42,
   constraints from the calculator rules p. 41, guidance, resources, provenance). Four need other documents:
   `past_paper_coverage`, `mark_scheme_coverage`, `examiner_report_coverage`, `grade_threshold_coverage`.
   Whether specimen papers/mark schemes count as evidence is a policy call for the owner (same open question as 0478).
2. **The knowledge layer (15 kinds) is empty**, as for every syllabus.
3. **Source monitoring is off** (`active = false`). The watcher's extraction profiles are Computer-Science-specific
   and a first run against the placeholder hash could create junk draft objectives. Enable it once a
   mathematics extraction profile exists, and let the first run replace the placeholder hash.
4. **Learners cannot reach it yet.** See `docs/curriculum/identity-gap.md`.

## Schema notes learned while doing this
- `curriculum_versions` has **no `level`** column; `curriculum_objectives` and `curriculum_coverage_checks`
  carry only `curriculum_version_id`; only `curriculum_knowledge` carries the full identity.
- Existing Computer Science sub-objectives store the outcome sentence in `paper_component` and a short
  sub-topic name in `description`. Grounding uses `description` as the statement, so those rows inject only
  the short names. Consider migrating them to the 9709 layout.
- `resolver.ts` filters objectives by `paper_component` when a learner specifies a paper, and there is no
  stored convention for that value, so 9709 leaves it empty rather than inventing one.
