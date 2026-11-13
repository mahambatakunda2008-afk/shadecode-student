# Cortex Verify: marking-resource acquisition strategy

**Status:** implementation policy and acquisition plan  
**Scope:** Cambridge, ZIMSEC and additional boards; all subjects and platforms  
**Rule:** find broadly, verify narrowly, reuse only with a recorded rights basis.

## 1. The resource network

Cortex Verify must not depend on one source or on manually hard-coding every answer key. Build a multi-channel resource network:

1. **Official public board sources** — current syllabuses, public specimen papers, public sample assessment materials, published examiner guidance and any mark schemes the board makes publicly available.
2. **Authenticated school/teacher portals** — resources available to registered centres or teachers. Connect only through authorised access. Do not scrape, bypass authentication, share credentials, or redistribute portal documents by default.
3. **Teacher and examiner contributions** — teacher-authored schemes, annotated candidate responses, classroom question banks and verified explanations. Capture the contributor, role, permission and review history.
4. **User-provided resources** — PDFs, images, DOCX, scans, photographed pages, worksheets and teacher handouts. Keep private to the account or institution unless the uploader explicitly establishes wider reuse rights.
5. **Open educational resources** — OER Commons, OpenStax, openly licensed university/school materials and repositories with explicit licence metadata. Record the exact licence and attribution; a publicly reachable URL is not automatically open-licensed.
6. **Licensed publishers and providers** — integrate only after the relevant licence or permission is recorded. Prefer provider APIs, feeds or authorised downloads.
7. **Community contributions** — student/teacher shared notes and worked examples with moderation, abuse reporting, provenance and a clear licence/visibility choice.
8. **Original Shadecode content** — create new questions, worked examples, diagrams, explanations and marking rubrics from verified syllabus outcomes. Original generation must not imitate or reproduce protected source questions or mark schemes.
9. **Cross-device and nearby transfer** — allow users/schools to transfer permitted packs over local network, QR pairing or peer-to-peer. Transfer the source manifest, rights metadata and hashes with the content. A transfer does not change the original permission scope.

## 2. Source discovery entry points

### Cambridge International
- Public subject pages and syllabus materials: https://www.cambridgeinternational.org/programmes-and-qualifications/
- Public guidance on where past papers and mark schemes are available: https://help.cambridgeinternational.org/hc/en-gb/articles/115004448905-Where-can-I-find-past-papers-mark-schemes-and-resources-for-our-exams
- School Support Hub: https://www.cambridgeinternational.org/support/

The School Support Hub is a teacher/registered-school resource portal. A school coordinator provisions teacher access. Treat it as an authenticated source, not a public crawler target. Cambridge says teachers at Cambridge schools may download and print past papers for use with their students, while publication or resale requires prior approval. Cambridge separately says it does not grant permission to publish past papers on a website or school intranet and does not grant electronic publication permission for past-paper questions or reproduction of mark schemes through its general permission route. Therefore, Shadecode must not bulk-copy Cambridge papers/mark schemes into a public product dataset without an applicable written licence or permission. Where reuse is not cleared, store a source link and help the authorised teacher/student access the original portal.

### ZIMSEC
- Official syllabus catalogue: https://www5.zimsec.co.zw/syllabi/
- Official ZIMSEC site: https://www5.zimsec.co.zw/

The syllabus catalogue is an official discovery entry point. Resolve the exact subject, level, version and document before extracting content. Do not assume that a syllabus catalogue listing includes a downloadable mark scheme. Ask schools, teachers and authorised examiners for materials they may lawfully share. Do not use restricted examiner systems or staff portals as public content sources.

### Other boards and providers
Continue the official-source register for Pearson Edexcel, IB, AQA, OCR, WAEC and additional national/regional boards. For each, discover the exact subject/specification, current exam cycle, assessment components and published resources. Keep board identities separate.

### Open and community resources
Search for open educational resources and community repositories only as discovery. Verify the publisher, source version, licence, attribution requirements, syllabus fit and accuracy before use. Community sites, student apps and file-sharing repositories are leads, not authorities. Do not treat search snippets or a third-party upload as proof that a paper or mark scheme is authentic.

## 3. Intake pipeline

Every resource follows a traceable state machine:

`discovered → identified → retrieved → extracted → normalized → reviewed → verified`

A failed or restricted source remains blocked or link-only. Never mark a source verified because OCR succeeded or an AI model produced a plausible summary.

Required evidence:
- source ID, title, publisher/authority and exact source URL;
- access method and whether authentication was required;
- source document filename/type, retrieval timestamp, byte length and SHA-256 when bytes are lawfully retained;
- licence/permission basis, permitted audience, use scope, attribution and expiry/conditions;
- board, qualification, level, subject, syllabus code/version, exam year, paper/component;
- extraction engine/version, page count, text fingerprint, page-level extraction warnings;
- review status, reviewer role/ID, timestamp, unresolved issues and corrections.

Use `src/lib/cortex/verify/marking-resource.ts` as the shared rights/provenance gate. Its current rubric validator requires verified source status, rights-cleared private offline use, matching syllabus identity, reviewer evidence, explicit limitations and criterion marks that sum to the total.

## 4. Build a useful marking scheme, not just a text dump

For every acquired paper/mark scheme pair:

1. Match paper and scheme by board, syllabus, exam year/series, component, variant and question number.
2. Extract page text and structure; retain page/region references.
3. OCR scanned pages locally where possible. Preserve diagrams, graphs, tables, equations, chemical structures, maps, source inserts and handwritten annotations as linked visual evidence.
4. Parse question parts and mark allocations without flattening (a)(i), (a)(ii), etc.
5. Extract mark points, alternative acceptable answers, error carried forward rules, method marks, accuracy marks, units, significant figures and examiner notes where present.
6. Keep the original mark scheme as source evidence when permitted. Create a normalized rubric as a separate derived record.
7. Flag ambiguous, diagram-dependent, context-dependent or method-dependent criteria for a human reviewer.
8. Require a subject-qualified reviewer for high-stakes promotion to offline marking.
9. Test the rubric against known candidate responses and edge cases, including valid alternative wording and common misconceptions.
10. Only then create a versioned offline rubric. The offline marker must clearly state its limits and allow connected Cortex/examiner review.

## 5. Use more than phrase matching

The current structured-points checker is a safe first rung, not the final engine. Grow the offline marker by answer type:

- **Exact numeric:** trusted numeric parser, tolerances, units, significant figures and explicitly defined acceptable forms.
- **MCQ:** private answer key, option identity and normalization.
- **Short factual response:** multiple approved answer forms, terminology and carefully scoped synonyms reviewed by a subject expert.
- **Structured response:** criterion-by-criterion points, method marks, linked subparts and explicitly allowed alternatives.
- **Mathematics/Physics working:** typed or handwritten step extraction, equation equivalence, method sequence, substitutions, units and follow-through rules. Never infer method marks from a final answer alone.
- **Chemistry:** formula/equation/ionic equation/structure recognition, state symbols, conditions, balancing and accepted representations.
- **Biology:** process sequence, labelled diagrams, data interpretation, variables, practical method and terminology.
- **Geography/History/Business/Economics/English:** evidence, case-study/source use, application, analysis, evaluation and judgement. Use richer criteria and human-reviewed exemplars; do not reduce extended writing to keyword bingo.
- **Graphs, maps and diagrams:** visual-region and label extraction, axis/scale/plot checks, annotations and geometry. Keep visual evidence available to the reviewer.
- **Practical/coursework:** task-specific checklists, safety, method, data quality, analysis and evaluation, with board-specific rules.

If an answer cannot be assessed safely offline, say exactly what is not supported and preserve the work for online review. Do not manufacture a mark.

## 6. Online resources and AI assistance

When connected, Cortex may:
- search approved public sources and official board pages;
- resolve links and fetch allowed public documents from an allow-list;
- show authenticated source links and remind teachers to use their own authorised access;
- compare a source against the syllabus version and detect likely mismatches;
- summarize, classify and propose candidate marking points from documents the user is authorised to provide;
- identify alternative answer forms and common misconceptions for reviewer consideration;
- generate original practice questions and worked examples from verified learning outcomes;
- request human review for ambiguous or high-impact criteria.

AI output is a draft. It must retain source references, be visibly unverified until reviewed, and must not become an offline answer key automatically. Never ask the model to reproduce a whole copyrighted paper or mark scheme. Search results are discovery evidence, not content rights.

## 7. Platform and offline behavior

- **Web/PWA:** discover online sources, import permitted user files, extract locally where supported, and cache reviewed packs in IndexedDB.
- **Android:** use on-device ML Kit OCR for supported text, import files through the system picker, store private source files and reviewed packs in app-private storage.
- **Desktop:** support file/folder import, PDF text and OCR extraction, local review, and offline pack storage. Do not make desktop parity depend on browser-only TextDetector.
- **All platforms:** share a versioned resource manifest and rubric contract. Sync only permitted material; keep private uploads private. Preserve source hash, licence scope, review state and syllabus identity through exports and peer transfer.

A pack is offline-ready only if the required source content and the relevant local marking engine are actually present on the device. A queued cloud request is not offline marking.

## 8. Immediate implementation order

1. Add resource evidence/rights types and tests. **Implemented in this branch of work.**
2. Add resource import for PDF/image/DOCX and persist source provenance, page references and OCR regions.
3. Add an online source discovery/search service with a strict domain allow-list and link-only default.
4. Build a mark-scheme document parser that extracts question hierarchy and criterion tables while preserving page images.
5. Add reviewer UI to approve, correct, reject and version candidate rubrics.
6. Connect verified rubrics to the shared question bank and offline pack builder.
7. Add school/teacher contribution and institution-scoped review.
8. Add safe local transfer and cross-device pack installation.
9. Expand the deterministic engines by subject and assessment type; validate with real reviewed responses.
10. Add source freshness checks for syllabus updates, errata, and new public resources.

## 9. Acceptance criteria

- No source is ingested without an explicit access and reuse decision.
- No restricted portal is crawled or bypassed.
- Every rubric points to exact source evidence and exact syllabus version.
- Every offline rubric has a named reviewer, timestamp, criteria, marks, approved answer forms and limitations.
- Source bytes and derived rubric are separate records.
- Unlicensed content is not redistributed.
- Online search can return a link-only result without copying the content.
- User/teacher uploads can be used privately only within the uploader's declared rights and the product's permitted scope.
- OCR and AI extraction never equal verification.
- The same rubric behaves consistently on web, Android and desktop.
- Unsupported answers are escalated honestly instead of receiving guessed marks.
