# Official curriculum source intake and verification runbook

**Purpose:** turn the source queue into evidence-backed, version-specific curriculum support without inventing coverage or silently changing production readiness.

This runbook is operational guidance. A URL in the queue is not proof that a document was retrieved; a retrieved PDF is not proof that it was fully extracted; extracted text is not proof that objectives or assessment rules were reconciled.

## Non-negotiable rules

1. Keep each record bound to board, qualification, level/stage, subject, syllabus/specification code, edition, effective exam years, and route/component where applicable.
2. Keep 2026–27 editions available alongside future editions. Never overwrite an older syllabus with a newer one or relabel its content.
3. Prefer official awarding-body documents and catalogue pages. Record the direct document URL and the authority page separately.
4. Preserve source bytes, SHA-256, retrieval time, document/page count, extractor/tool version, extracted-text fingerprint, and extraction outcome. A hash identifies bytes; it does not establish correctness.
5. Never mark a syllabus verified because its database status says `verified`, its topic names look plausible, or its source page exists.
6. Never promote automatically. Keep `auto_promote=false` unless a separately reviewed governance change explicitly authorizes it.
7. Do not bulk-demote existing records just because evidence is missing. Report blockers and reconcile each version.
8. Respect access restrictions and copyright. Do not bypass restricted guides or redistribute documents beyond the permitted use.
9. A failed fetch, empty extraction, partial extraction, or ambiguous edition must remain visible as such. Do not report it as successful ingestion.
10. A curriculum readiness report is a gate, not a guarantee of educational accuracy. Human reconciliation against the official source remains necessary.

## Intake lifecycle

Use the following stages in source manifests, reports, or review notes. Do not collapse them into one generic “supported” flag.

| Stage | Minimum evidence | Allowed claim |
| --- | --- | --- |
| `discovered` | Official authority/catalogue page and the exact qualification or subject identity | Authority/catalogue located |
| `document_identified` | Exact edition and direct official document URL; effective years confirmed | Candidate source identified |
| `retrieved` | Successful response, retrieval timestamp, MIME/type, byte length, SHA-256, preserved source artifact | Source bytes captured |
| `extracted` | Extractor name/version, page count, non-empty text, text fingerprint, extraction warnings and page-level coverage | Text extracted, with stated limitations |
| `normalized` | Structured topics, subsections, numbered outcomes, route/level boundaries, assessment components and practical requirements linked to source locations | Candidate structured pack exists |
| `reconciled` | Every source section/outcome accounted for; additions, removals and ambiguities reviewed; second-person review recorded | Content reconciled to this edition |
| `verified` | All required coverage dimensions complete under an explicit board/qualification-specific policy, objectives reviewed, whole-syllabus review evidence recorded, source and extraction evidence retained | This exact version passed the defined review gate |

A transition must include evidence and a timestamp. If the official source changes, the affected version returns to review; prior snapshots remain available.

## Per-version checklist

### Identity and edition
- [ ] Awarding body and country/council (where relevant) are explicit.
- [ ] Qualification, stage/level, subject and exact syllabus/specification code are confirmed.
- [ ] Edition/version, publication date if stated, first teaching and first examination years are captured.
- [ ] Exam-year selection and route/component boundaries are explicit.
- [ ] The official authority page and direct source-document URL are both recorded.
- [ ] The document is not being confused with another edition, route, subject, or qualification.

### Source and extraction evidence
- [ ] Original PDF/document bytes are preserved according to project retention rules.
- [ ] SHA-256 is calculated from the downloaded bytes, not copied from a URL or guessed.
- [ ] Retrieval time, response status, content type, byte length, page count, and extractor version are recorded.
- [ ] Extracted text is non-empty and stored character count matches the actual text.
- [ ] Extraction quality is reviewed across all pages, including tables, diagrams, footnotes, appendices and practical guidance.
- [ ] Extraction warnings and missing/garbled pages are recorded; scanned pages receive OCR only when needed and reviewed.
- [ ] A text fingerprint is calculated independently from the source-byte hash.
- [ ] Source changes create a new immutable snapshot; they do not overwrite historical evidence.

### Curriculum reconciliation
- [ ] All numbered learning outcomes/objectives are captured without invented or merged outcomes.
- [ ] Topic/subtopic hierarchy and syllabus section references are retained.
- [ ] Level boundaries (e.g. AS vs A Level, primary stage vs lower secondary) are correct.
- [ ] Mathematics or other routed subjects preserve route-specific content and paper/component combinations.
- [ ] Assessment papers/components, duration, marks, weighting, question format and availability are checked against the source.
- [ ] Practical, coursework, programming, fieldwork, oral, language, and endorsement requirements are checked where applicable.
- [ ] Removed, added, renamed and materially changed content is diffed against the previous edition.
- [ ] Every objective is either reviewed against a source location or explicitly blocked; no topic-name inference is used as a substitute.
- [ ] A second reviewer records name/role, review date, scope and unresolved issues.

### Coverage policy and release
- [ ] Expected coverage dimensions are explicitly configured for this board/qualification/subject model.
- [ ] The policy includes rationale for any not-applicable dimensions.
- [ ] The number of expected dimensions is consistent between source manifest, version provenance, tests and readiness report.
- [ ] Every expected dimension is `verified` or `not_applicable` with a rationale; missing dimensions remain blockers.
- [ ] Whole-syllabus review method/date and reviewer evidence are recorded.
- [ ] The read-only readiness report is run and reviewed.
- [ ] CI passes on the exact proposed commit; any schema change is tested against non-production first.
- [ ] No production migration, bulk status update, or promotion is inferred from this checklist alone.

## Coverage-dimension policy: avoid silent count mismatches

The repository has used both 25-dimension checks in source-intake records and a 29-dimension default in the readiness framework. These counts must not be treated as interchangeable.

- For every curriculum version, set `provenance.coveragePolicy.expectedDimensions` to the reviewed policy count.
- Define the dimension IDs and applicability rules in a board/qualification-specific policy artifact or the existing canonical framework.
- Keep the 29-dimension default only as a compatibility fallback for older rows; it is not a universal claim that every board has exactly 29 applicable dimensions.
- Do not declare a 25-dimension policy complete until the 25 dimension IDs are explicitly mapped to the canonical framework and the mapping is reviewed.
- Test the exact configured count, one-missing-dimension blocker, and not-applicable-without-rationale blocker.
- A policy count mismatch is a blocker to verification, not a reason to lower the gate automatically.

## Current priority order

Use `docs/curriculum/official-source-intake-queue.json` as a queue, not as evidence of ingestion. Prioritize in this order unless new evidence changes the decision:

1. Cambridge 9700, 9701, 9702 and 9709 for 2028–2030: retrieve and fingerprint each exact official PDF, extract, and compare against the 2025–2027 or 2026–2027 packs without overwriting them. Mathematics route/component matrices require separate review.
2. Reconcile the existing Cambridge 2025–2027 Biology, Chemistry and Physics packs and Mathematics 2026–2027 pack against their exact official PDFs and current database provenance.
3. Cambridge 9618 and 0478: resolve extraction/document-evidence gaps and confirm the exact edition before any readiness claim.
4. ZIMSEC Computer Science 4021: retrieve the official syllabus from the authority's catalogue, independently reconcile objectives and assessment, and keep the current pack draft until evidence passes.
5. ZIMSEC Primary: enumerate grades/stages and subjects from official sources, then acquire a separate authoritative document per subject and edition. Do not infer Grades 1–7 from Infant or O Level material.
6. Pearson Edexcel, IB, AQA, OCR, WAEC, and Cambridge Primary/Lower Secondary: discover exact specifications/frameworks by subject and level before claiming subject-level support. WAEC must retain country/council/exam distinctions; IB access restrictions must be respected.

## Commands and safe review loop

Run the report with credentials available only in a trusted local/CI environment:

```sh
npm run report:curriculum-readiness
npm run report:curriculum-readiness -- --fail-on-blockers
```

The report is read-only. The second command should fail while any curriculum version remains blocked; that is an intentional release signal, not a reason to suppress blockers.

Before a PR is considered complete:
1. Attach the official source identity and retrieval evidence to the review.
2. Run extraction and reconciliation for the exact edition.
3. Review the complete topic/objective/assessment diff.
4. Run unit tests, typecheck, lint and build on the latest commit.
5. Validate additive schema changes against a non-production Supabase environment.
6. Review readiness output and unresolved issues.
7. Merge/deploy only after the evidence and required checks pass.

## Reporting template

For each syllabus, report:

- **Identity:** board / qualification / level / subject / code / edition / exam years / route
- **Authority:** authority page / direct document URL / access status
- **Source artifact:** retrieved-at / HTTP result / MIME / bytes / SHA-256 / page count
- **Extraction:** tool and version / extracted characters / text fingerprint / warnings / pages reviewed
- **Reconciliation:** objective count / reviewed count / unresolved count / assessment and practical checks / edition diff
- **Coverage:** policy ID and version / expected dimensions / verified / not-applicable with rationale / missing
- **Review:** reviewer(s) / date / method / unresolved risks
- **Readiness:** ready or blocked, with explicit blocker list
- **Change impact:** prior version retained? source changed? affected records? production mutation? (normally none during intake review)

Do not use a global “all boards verified” claim. Report exact subject, edition, stage, and evidence state.


## Live audit checkpoint (2026-10-21)

The most recent read-only production audit found the following aggregate evidence gaps. Treat these as investigation targets, not proof that every underlying curriculum entry is incorrect:

- `curriculum_documents`: 9 rows; none currently has non-whitespace `extracted_text`.
- Five document rows and five curriculum-version rows carry a `verified` status despite the extraction evidence gap.
- `curriculum_ingestion_runs`: 0 recorded rows at the time of audit.
- `curriculum_sources`: 12 rows, with `auto_promote=false` for all rows.
- `curriculum_coverage_checks`: 201 rows; `curriculum_objectives`: 1,380 rows, all carrying a `verified` label at the time of audit.
- Sampled fingerprints included MD5-shaped values, placeholders, and normalized labels. These samples do not establish that the values are SHA-256 hashes of original source bytes.

### Required handling

1. Do not mass-delete or mass-demote existing curriculum data based on this aggregate report.
2. Retrieve and preserve the exact source document for each affected version, where official access permits.
3. Compute a SHA-256 digest from the actual downloaded bytes and independently fingerprint extracted text.
4. Recover extraction text and inspect page coverage, including tables, figures, appendices, and practical requirements.
5. Reconcile each version against its exact official edition, recording objective-level source locations and a second review.
6. Run the readiness report in a trusted environment with read-only database credentials. Keep credentials out of logs and repository files.
7. Record the report output and blockers in the PR review. A passing software test suite is not evidence that a syllabus itself is complete or correct.

**Validation note:** the readiness PR must have fresh CI on its current head. A Vercel status alone does not replace GitHub Actions typecheck, lint, test, and build results. Do not merge or deploy based on the audit checkpoint alone.
