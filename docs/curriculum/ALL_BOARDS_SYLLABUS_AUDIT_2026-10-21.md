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
| Cambridge International AS & A Level Biology 9700 | Live database has a verified `2025-2027` version, 259 verified objectives and 278 verified knowledge rows, but only 6 coverage dimensions are recorded; the source document is marked `draft` with manual extraction. | **Verified flag, incomplete evidence picture** | Reconcile the source document status and completeness gate before treating the pack as fully verified. Build the 2028-2030 version for candidates sitting from 2028 onward. |
| Cambridge International AS & A Level Chemistry 9701 | Structured outcome dataset `cambridge-9701-2025-2027.json`; live database version is `verified` with 388 verified objectives and 606 verified knowledge rows, but has no coverage-check rows. | **Verified flag, coverage evidence gap; version-bound** | Add/reconcile completeness dimensions and build the 2028-2030 syllabus before claiming coverage for candidates sitting in 2028 onward. The official subject page lists both 2025-2027 and 2028-2030 versions. |
| Cambridge International AS & A Level Physics 9702 | Structured outcome dataset `cambridge-9702-2025-2027.json`; live database has 325 verified objectives, 514 verified knowledge rows and 23 verified + 2 not-applicable coverage dimensions, but the source document remains `draft` with manual extraction. | **Verified flag conflicts with document state; version-bound** | Resolve the source-document/version evidence and complete a reviewable source reconciliation; then ingest and reconcile the 2028-2030 syllabus. Do not assume the older JSON matches the new version. |
| Cambridge International AS & A Level Mathematics 9709 | Structured datasets `cambridge-9709-2026-2027.json` and `cambridge-9709-knowledge-2026-2027.json`; live database has 159 verified objectives, 235 verified knowledge rows and 22 verified + 3 not-applicable coverage dimensions, but the source document remains `draft` with manual extraction. | **Verified flag conflicts with document state; version-bound** | Resolve the source-document/version evidence. The official page lists a 2028-2030 syllabus; create a separate immutable 2028-2030 dataset, diff objectives and paper structure, and test both versions. |
| Cambridge IGCSE Computer Science 0478 | Live database: version `verified`, 68/68 objectives verified, 75/75 knowledge rows verified across 16 kinds, and 27 verified + 2 not-applicable coverage dimensions. However, the linked document is `verified` while extraction is only `partial`, with 56 pages but zero stored content characters. | **Version/knowledge verified flags present, but provenance/extraction mismatch must be resolved** | Re-run the source reconciliation against the official 2026-2028 version and close the cached-version discrepancy. Investigate why the document has no extracted text while version and knowledge rows are verified. Do not rely on status labels alone. |
| Cambridge International AS & A Level Computer Science 9618 | Live database version `2027-2029` is `draft`; it has 20 objectives (rows currently marked verified) but zero knowledge rows and only 2/29 coverage dimensions verified. `official-syllabi/9618.pdf` and candidate-content/progression/requirements TypeScript modules also exist. | **Draft / partial; not production-verified** | Establish the PDF's exact edition, exam years and hash; reconcile all outcomes, assessment objectives, paper/component structure and practical/programming requirements into a versioned canonical pack. Candidate-content modules alone are not proof of complete syllabus verification. |
| Cambridge International AS & A Level Economics 9708 | `official-syllabi/9708.pdf`; no matching live `curriculum_versions` row was returned by the production database inventory. | **Source present; not verified as a complete pack** | Confirm source version and create a normalized outcome/assessment pack with provenance and completeness-gate evidence. |
| Other Cambridge qualifications and subjects | Official Cambridge syllabus finder is linked below, but no complete normalized pack for every listed subject was found in the checked-in curriculum dataset paths. | **Not yet audited subject by subject** | Enumerate subjects/levels and syllabus years from the official source, then ingest each as a separate versioned unit. Do not infer coverage from a board-level entry. |
| ZIMSEC O Level Computer Science 4021 (2024-2030) | Live database version and source document are both `draft`; 141 objective rows are marked verified but there are zero verified knowledge rows and only 2/29 coverage dimensions verified (27 unresolved). The checked-in TypeScript explicitly says the official PDF was not independently retrieved. | **Blocked / draft** | Resolve official-source retrieval, independently compare the full official syllabus and assessment structure, then promote only through the verification pipeline. Do not treat verified objective row labels as proof of a verified syllabus. |
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


## Production database reconciliation snapshot (read-only, 2026-10-21)

The live `shadecode-student` Supabase project was queried read-only after the repository-only review. This is a point-in-time snapshot, not a permanent truth; re-run it after ingestion or verification changes.

| Exact version in database | Version status | Objectives | Verified knowledge rows | Coverage-check state | Interpretation |
|---|---:|---:|---:|---|---|
| Cambridge IGCSE Computer Science 0478, 2026-2028 | verified | 68/68 verified | 75/75 across 16 kinds | 27 verified + 2 not applicable | Most complete version in this snapshot, but document extraction says `partial`, page count 56 and stored content length 0. Investigate the source/provenance mismatch before calling the source pipeline healthy. |
| Cambridge IGCSE (9-1) Computer Science 0984, 2026-2028 | draft | 10 objectives | 0 | 2 verified + 27 unresolved | Must not be presented as verified. |
| Cambridge O Level Computer Science 2210, 2026-2028 | draft | 10 objectives | 0 | 2 verified + 27 unresolved | Must not be presented as verified. |
| Cambridge AS & A Level Computer Science 9618, 2027-2029 | draft | 20 objectives | 0 | 2 verified + 27 unresolved | Must not be presented as verified. |
| Cambridge AS & A Level Biology 9700, 2025-2027 | verified | 259/259 verified | 278/278 | 6 verified dimensions only | Source document itself is draft/manual extraction; expand completeness evidence and build 2028-2030 pack. |
| Cambridge AS & A Level Chemistry 9701, 2025-2027 | verified | 388/388 verified | 606/606 | 0 coverage-check rows | The version status is verified, but absence of coverage rows means the complete 29-dimension gate is not demonstrated by this table. Reconcile checks and add 2028-2030. |
| Cambridge AS & A Level Physics 9702, 2025-2027 | verified | 325/325 verified | 514/514 | 23 verified + 2 not applicable | Source document is still draft/manual extraction. Resolve the source/document state and add 2028-2030. |
| Cambridge AS & A Level Mathematics 9709, 2026-2027 | verified | 159/159 verified | 235/235 | 22 verified + 3 not applicable | Source document is still draft/manual extraction. Resolve source/document state and add 2028-2030. |
| ZIMSEC O Level Computer Science 4021, 2024-2030 | draft | 141 objective rows marked verified | 0 | 2 verified + 27 unresolved | Overall version remains draft. Objective-row status does not override the version-level gate. |

### Important database integrity finding

Some records have a version-level `verified` status even where the source document is `draft` or `extraction_status` is `manual`, and the 9701 record has no coverage-check rows. This may reflect older verification flows or incomplete synchronization. **Do not blindly bulk-promote, demote or rewrite production rows to make labels match.** First inspect the resolver's exact gate semantics, review verification events and source hashes, and reconcile one syllabus at a time with an auditable change.

The 0478 snapshot also has 75 verified knowledge rows in 16 kinds, while an older documentation note says 15 kinds. Update the older note after confirming the intended kind set and its test manifest.
