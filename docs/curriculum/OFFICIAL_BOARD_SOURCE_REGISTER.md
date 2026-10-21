# Official exam-board source register and 2026–27 verification plan

Audit date: 2026-10-21

## Purpose and trust boundary

This register records official discovery entry points and the evidence needed before a curriculum can be called verified in Shadecode Student. It is not a claim that every subject, qualification, or board has already been ingested. A board landing page is a discovery source, not a substitute for the exact subject specification or syllabus PDF.

Treat the examination year, first-teaching year, and first-assessment year as separate fields. For each exact board + qualification + subject + syllabus code + exam year, retain the source URL, source title, publication/version date, effective exam years, extracted content, page count, a computed fingerprint of the actual source bytes, coverage evidence, and reviewer/check status.

Do not infer missing topics from a syllabus title, previous edition, another board's course, or AI output. If a source cannot be fetched, extracted, fingerprinted, or checked, label that exact identity/year as blocked or unverified rather than silently falling back to another version.

## Official discovery sources

| Board / programme | Official entry point | What is established from the source | Required next step |
| --- | --- | --- | --- |
| Cambridge International | https://www.cambridgeinternational.org/programmes-and-qualifications/ | Subject pages expose syllabus documents by exam year. Cambridge's help guidance says the syllabus year is the calendar year in which the candidate sits the exam. Some courses have distinct 2026, 2027 and 2028–2030 editions; set texts and updates can vary by exam year. | For every subject/code, collect the exact PDF for each requested exam year, check syllabus updates and set-text supplements, then extract and compare the actual PDF bytes. Do not assume one 2025–2027 PDF means all course materials are unchanged across both years. |
| Pearson Edexcel International GCSE | https://qualifications.pearson.com/en/qualifications/edexcel-international-gcses.html | Official catalogue lists available subjects and exam-series availability. Availability and specification are subject-specific. | Capture each subject's qualification code, specification PDF, issue/version date, assessment availability and any amendments. |
| Pearson Edexcel International A Level | https://qualifications.pearson.com/en/qualifications/edexcel-international-advanced-levels.html | Official qualification-family entry point. | Verify subject-specific specifications and assessment series independently; do not infer from International GCSE pages. |
| International Baccalaureate Diploma Programme | https://www.ibo.org/programmes/diploma-programme/curriculum/ | The curriculum is organised into subject groups and the DP core; subject pages link subject briefs. | Record subject, SL/HL applicability, current syllabus cycle, first teaching and first assessment. Follow the official curriculum-updates page for changes. |
| International Baccalaureate curriculum updates | https://ibo.org/university-admission/latest-curriculum-updates | Official updates distinguish first teaching from first assessment. At the audit date, the page lists updates for first teaching in 2025, 2026 and 2027, including Mathematics and languages for 2027 and History for 2026. | Keep old and new course cycles side by side, keyed by first assessment year. Never overwrite the prior course just because a new syllabus has been announced. |
| AQA | https://www.aqa.org.uk/qualifications | Official catalogue provides subject specifications and qualifications. Some subject specifications include explicit changes for first exams in 2027. | Identify the exact qualification code and specification issue; review change notices, optional texts, practical/NEA rules and first-exam date. |
| OCR | https://www.ocr.org.uk/qualifications/ | Official catalogue exposes qualification specifications and updates, including separate AS and A Level documents where applicable. | Capture exact qualification code, accredited specification, update date and assessment year. Avoid relying on catalogue snippets alone. |
| ZIMSEC | https://www5.zimsec.co.zw/syllabi/ | Official syllabus directory is a discovery entry point. The current database record for O Level Computer Science 4021 points to this directory, not an extracted subject PDF. | Locate and preserve the exact official syllabus for each subject and version. A directory URL is not enough to mark a subject verified. Confirm effective years and any revised syllabus circulars. |
| WAEC / WASSCE | Official WAEC site: https://www.waeconline.org.ng/ | An exact official syllabus document/source for each subject and the 2026/2027 exam cycle was not confirmed in this audit. | Find and verify the official subject-specific syllabus or regulations for the relevant country/WAEC examination before registering any content. Do not substitute unofficial notes or e-learning summaries. |

## Database audit snapshot

A read-only Supabase audit on 2026-10-21 found 9 rows in `curriculum_versions` and 9 linked `curriculum_documents`. All 9 linked documents had `content_characters = 0`. Some records had extraction status `verified`, `manual`, or `partial`, and some version records had passing coverage rows, but zero extracted characters means the source content itself has not been evidenced in the database. Some stored fingerprints were placeholders or non-content identifiers; some were short hexadecimal values without evidence that they were computed from the downloaded source bytes.

Therefore, **none of these nine records should be considered production-ready solely because its status says `verified` or because coverage checks are marked complete**. The resolver's fail-closed checks should remain in force. Do not edit live status fields to make the catalogue look complete.

Current records include Cambridge Biology 9700 (2025–2027), Chemistry 9701 (2025–2027), Computer Science 9618 (2027–2029), Mathematics 9709 (2026–2027), Physics 9702 (2025–2027), IGCSE Computer Science 0478 (2026–2028), IGCSE (9–1) Computer Science 0984 (2026–2028), O Level Computer Science 2210 (2026–2028), and ZIMSEC O Level Computer Science 4021 (candidate range 2024–2030). These are **registered candidates, not a claim of verified syllabus coverage**.

## Acceptance checklist per syllabus version

- [ ] Official awarding-body source URL resolves to the exact subject and qualification.
- [ ] Source file is downloaded and retained with title, publication/version metadata, page count, and fetch timestamp.
- [ ] Fingerprint is computed from the actual downloaded bytes; placeholders and manually named hashes are rejected.
- [ ] Text extraction is non-empty and validated against the page count and document structure.
- [ ] OCR is reviewed for tables, equations, diagrams, symbols, and learning outcomes that may be lost by text extraction.
- [ ] Exact exam-year range is explicit; first-teaching and first-assessment dates are recorded separately where relevant.
- [ ] All required coverage dimensions have evidence tied to source pages/sections, or a reasoned `not_applicable` determination.
- [ ] Amendments, errata, set texts, practical endorsements, coursework/NEA and assessment-component changes are checked.
- [ ] A second check confirms no topics were invented, omitted, duplicated, or imported from another syllabus edition.
- [ ] Automated trust gates and resolver tests pass before any student-facing route uses the version.

## Board expansion policy

The initial register intentionally prioritises the boards currently represented or discussed in the project: Cambridge International, ZIMSEC, Pearson Edexcel, IB, AQA, OCR and WAEC. It is not an exhaustive list of all awarding bodies worldwide. Add WJEC/Eduqas, CCEA, national curricula, regional boards, and further international programmes as separately identified providers, with official-source evidence and explicit scope. Never merge syllabi from different awarding bodies under a generic subject label.
