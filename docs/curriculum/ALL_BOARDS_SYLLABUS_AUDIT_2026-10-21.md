# All-board syllabus coverage audit

**Audit date:** 2026-10-21  
**Scope:** Repository-backed curriculum assets and official awarding-body source discovery.  
**Purpose:** Establish what Shadecode Student can truthfully claim today, identify version gaps, and define the safest path to broad multi-board coverage.

> **Important:** This is a repository/source audit, not a claim that every syllabus in the world has been ingested. A board appearing in a selector or registry is not proof of verified syllabus coverage. A PDF in the repository is not proof that the full syllabus, assessment structure, and learning outcomes have been normalized and reconciled.

## Status vocabulary

- **Verified (bounded):** exact board + qualification + subject + syllabus version has reconciled authoritative evidence for the dimensions required by the relevant gate. This does not automatically verify other subjects or versions.
- **Structured, version-bound:** normalized syllabus content exists, but it is not the current version for every future exam year and/or the full verification gate has not been demonstrated.
- **Partial / source present:** some source files, candidate content, topic summaries, or knowledge records exist, but whole-syllabus reconciliation is not demonstrated.
- **Unverified / framework only:** the board or qualification is represented in architecture/registry, but the repository does not contain a verified subject/version pack.
- **Blocked / draft:** data explicitly remains draft, source evidence is missing, or a known discrepancy blocks production claims.

## Findings from the checked-in repository

| Board / authority | What is present in the repository | Audit status | Main gap / next action |
|---|---|---|---|
| Cambridge International AS & A Level Chemistry 9701 | Structured outcome dataset `cambridge-9701-2025-2027.json`; official source URL and version metadata | **Structured, version-bound** | Build and reconcile the 2028-2030 syllabus before claiming coverage for candidates sitting in 2028 onward. The official subject page lists both 2025-2027 and 2028-2030 versions. |
| Cambridge International AS & A Level Physics 9702 | Structured outcome dataset `cambridge-9702-2025-2027.json`; PDF `official-syllabi/9702.pdf` | **Structured, version-bound** | Confirm PDF identity/version, then ingest and reconcile the 2028-2030 syllabus. Do not assume the older JSON matches the new version. |
| Cambridge International AS & A Level Mathematics 9709 | Structured datasets `cambridge-9709-2026-2027.json` and `cambridge-9709-knowledge-2026-2027.json`; related tests and TypeScript sources | **Structured, version-bound** | The official page lists a 2028-2030 syllabus. Create a separate immutable 2028-2030 dataset, diff the objectives and paper structure, and test both versions. |
| Cambridge IGCSE Computer Science 0478 | Verification manifest/tests and `docs/curriculum/0478-verification-status.md`. That status note reports a live-data result of 29/29 dimensions and 75 knowledge items across 15 required kinds, but it also documents a stale cached source snapshot/version discrepancy. | **Conditional; recheck live evidence** | Re-run the documented database/source reconciliation against the official 2026-2028 version and confirm the version-6 source wording is reflected. Do not rely on the stale status document alone. |
| Cambridge International AS & A Level Computer Science 9618 | `official-syllabi/9618.pdf` plus candidate-content, progression, and requirements TypeScript modules/tests | **Partial / version identity needs confirmation** | Establish the PDF's exact edition, exam years and hash; reconcile all syllabus outcomes, assessment objectives, paper/component structure and practical/programming requirements into a versioned canonical pack. Candidate-content modules alone are not proof of complete syllabus verification. |
| Cambridge International AS & A Level Economics 9708 | `official-syllabi/9708.pdf` | **Source present; not verified as a complete pack** | Confirm source version and create a normalized outcome/assessment pack with provenance and completeness-gate evidence. |
| Other Cambridge qualifications and subjects | Official Cambridge syllabus finder is linked below, but no complete normalized pack for every listed subject was found in the checked-in curriculum dataset paths. | **Not yet audited subject by subject** | Enumerate subjects/levels and syllabus years from the official source, then ingest each as a separate versioned unit. Do not infer coverage from a board-level entry. |
| ZIMSEC O Level Computer Science 4021 (2024-2030) | Objective/topic inventory and assessment/content modules exist. The main objective file explicitly marks objectives `draft` because the official ZIMSEC PDF was not independently retrieved; comments say the Code Lab guard should not surface these as exam-required content. | **Blocked / draft** | Resolve official-source retrieval, independently compare the full official syllabus and assessment structure, then promote only through the verification pipeline. Do not describe the 141-objective inventory as verified while the canonical source gate remains blocked. |
| Other ZIMSEC subjects, including primary and A Level | Official ZIMSEC syllabus catalogue exists, but the repository paths inspected do not show a normalized, whole-syllabus verified dataset for each of these subjects. | **Unverified subject by subject** | Build an inventory from the official catalogue, prioritize Zimbabwean primary and common O/A Level subjects, and preserve exact form, subject, year/version, papers and practical/project rules. |
| Pearson Edexcel (International GCSE / International A Level / other routes) | Board registry entry with `support: "available"`; no complete normalized syllabus dataset for this board was found in the inspected curriculum data paths. | **Registry/framework only; not verified coverage** | Discover exact specifications from Pearson, including route/specification code and first-assessment year. Do not present board availability as verified subject coverage. |
| International Baccalaureate (MYP / DP) | Board registry entry with `support: "available"`; no complete normalized subject-guide pack found in the inspected curriculum data paths. | **Registry/framework only; not verified coverage** | Treat MYP subject-group frameworks and DP subject guides separately; include SL/HL, internal assessment, core requirements, exam components and curriculum review/version dates. |
| AQA | No board entry or normalized syllabus pack found in the inspected registry/data paths. Official qualifications catalogue is available. | **Not onboarded / unverified** | Add board identity only when routing and qualification metadata are ready; then ingest specific GCSE/AS/A Level specifications. |
| OCR | No board entry or normalized syllabus pack found in the inspected registry/data paths. Official qualification/specification catalogue is available. | **Not onboarded / unverified** | Ingest specific qualification/specification codes and variants. OCR specification variants must not be conflated. |
| WAEC (country-specific examinations) | No board entry or normalized syllabus pack found in the inspected registry/data paths. Official WAEC national sites publish syllabuses and examination information. | **Not onboarded / unverified** | Model national office and exam separately (for example, WAEC Nigeria vs WAEC Ghana), including WASSCE/BECE and applicable syllabus revisions. Do not treat WAEC as one interchangeable curriculum. |
| University / Polytechnic / TVET | Registry says `framework`; no institution/programme-specific syllabus packs established by this audit. | **Framework only** | Require institution, programme, qualification level, module code, cohort/year and approved programme documentation before claiming course coverage. |
| Other national / regional boards worldwide | No exhaustive global inventory was found in the checked-in registry. | **Not yet inventoried** | Use an extensible board registry and a source-discovery backlog. “All boards” must be treated as an ongoing coverage programme, not a one-time checkbox. |

## High-priority version issue: Cambridge 2028-2030

Cambridge states that syllabus year refers to the year of examination: candidates sitting in 2028 follow the 2028-2030 syllabus. The repository's 9701 and 9702 structured datasets cover 2025-2027, while the 9709 datasets cover 2026-2027. These packs must not silently be used as authoritative exam scope for 2028 candidates.

Required work:

1. Fetch each official 2028-2030 syllabus and relevant syllabus-update notices.
2. Record source URL, publication/version, retrieval timestamp and SHA-256 hash.
3. Extract topics, numbered learning outcomes, exclusions, command words, assessment objectives, papers/components, weightings, practical/coursework/project requirements and permitted resources.
4. Compare against the prior version; explicitly classify additions, removals, changed wording, moved topics, paper changes and unchanged sections.
5. Create new immutable dataset/version identifiers rather than overwriting the 2025-2027 or 2026-2027 packs.
6. Run deterministic completeness and regression tests, then reconcile against the official PDF with a human review record.
7. Ensure exam-year selection resolves to the exact version; cached lessons, generated exams, progress and analytics must retain their original syllabus identity.

## Verification contract for every board and syllabus

A syllabus pack may not be marked production-verified merely because the subject name, topic headings or a PDF are present. Use the existing completeness dimensions in `src/lib/curriculum/completeness.ts` and the production policy in `src/lib/curriculum/verification/README.md`.

For each exact `board + qualification + subject/specification + syllabus version + exam year`, require:

- authoritative source identity and version, source URL, retrieval date and content hash;
- whole-document structural inventory and reconciled scope;
- normalized topic hierarchy and granular learning outcomes, including exclusions and required depth;
- assessment objectives, component/paper identifiers, duration, marks, weightings and route/options;
- practical, programming, coursework, project, fieldwork or internal-assessment requirements where applicable;
- terminology, command words, constraints, permitted resources and source locators/pages;
- version diff and change history;
- evidence for past-paper, mark-scheme, examiner-report and grade-threshold claims separately from syllabus evidence;
- tests for completeness, topic resolution, exam-year routing, cross-board isolation and cache/version isolation.

If a dimension truly does not apply, record `not_applicable` with evidence. Missing evidence remains missing; it must not be auto-promoted to verified. Teaching may use a syllabus-level gate only when it does not make exam-history claims. Exam simulation and claims about past-paper patterns require the stricter exam-history gate.

## Recommended execution order

### P0: prevent wrong-year / false-coverage claims
1. Reconcile Cambridge 0478 against the exact official 2026-2028 source and close the cached-version discrepancy.
2. Build Cambridge 9701, 9702 and 9709 2028-2030 packs as separate immutable versions.
3. Confirm the exact source edition of 9618 and 9708 PDFs; convert them into versioned structured packs or mark them explicitly unavailable for verified generation.
4. Resolve ZIMSEC 4021 official-source verification. Keep it draft until evidence passes the gate.
5. Check UI/API resolution so a board-level `available` flag can never be mistaken for a subject/version-level verified status.

### P1: serve the home market properly
6. Inventory the official ZIMSEC catalogue across Infant/Primary, Forms 1-4, O Level and A Level; prioritize common compulsory subjects and subjects with real learner demand.
7. Complete Cambridge IGCSE/O Level and primary/lower-secondary coverage subject by subject, not by a single Cambridge badge.
8. Add automated coverage reporting that lists every qualification/subject/version as verified, partial, draft, blocked or absent.

### P2: expand major international boards
9. Pearson Edexcel, AQA and OCR: ingest specification-by-specification, retaining variants and first-assessment years.
10. IB: ingest MYP and DP separately; model SL/HL and internal assessment/DP core requirements.
11. WAEC: model country office and exam family explicitly; ingest the exact official syllabus/version for each subject.

### P3: expand regionally and globally
12. Add national boards only through the same evidence gate, prioritized by actual learner demand and reliable official sources. Candidate targets include South Africa CAPS/IEB, Kenya KNEC, Uganda UNEB, Nigeria NECO, Botswana BEC, India CBSE/ICSE, US AP, and other locally relevant boards.
13. Add source monitoring for new syllabuses and a human-reviewed diff workflow. A detected PDF change must trigger review, not silently overwrite a verified pack.

## Official source starting points checked on 2026-10-21

- Cambridge International syllabus finder: https://www.cambridgeinternational.org/find-syllabus-materials/
- Cambridge Chemistry 9701 syllabus overview (lists 2025-2027 and 2028-2030): https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-chemistry-9701/
- Cambridge Mathematics 9709 syllabus overview (lists 2026-2027 and 2028-2030): https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-international-as-and-a-level-mathematics-9709/
- Cambridge exam-year guidance: https://help.cambridgeinternational.org/hc/en-gb/articles/37190057441298-General-FAQ-Which-syllabus-year-should-I-use
- ZIMSEC official syllabus catalogue: https://www5.zimsec.co.zw/syllabi/
- Pearson Edexcel International GCSEs: https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses.html
- Pearson International GCSE subject finder: https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses.a-z.html
- IB Diploma Programme curriculum: https://www.ibo.org/programmes/diploma-programme/curriculum/
- IB Middle Years Programme curriculum: https://ibo.org/programmes/middle-years-programme/curriculum/
- AQA qualifications catalogue: https://www.aqa.org.uk/qualifications
- OCR qualification/specification catalogue: https://www.ocr.org.uk/qualifications/qualification-details/qualification-details.aspx
- WAEC Ghana official examination/syllabus pages: https://waecgh.org/home/gbce-abce/
- WAEC Nigeria official information: https://waecnigeria.org/faq

## Definition of done for this audit

This audit is a baseline, not a completed global syllabus ingestion. It is complete as a coverage-status document only. The product's syllabus coverage is complete only when the subject/version-level inventory is generated from the registry and stored evidence, all intended board/qualification combinations are accounted for, stale versions are flagged, and production claims are derived from the same verified evidence used by the resolver.
