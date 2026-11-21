# Cambridge Biology 9700 (2028–2030): Topics 18–19 integration readiness

**Purpose:** record the safe boundary between the completed draft learning assets and the live curriculum database. This is an integration checkpoint, not a publication approval.

## Verified syllabus scope

The official Cambridge syllabus for examinations in 2028, 2029 and 2030 contains 19 topics. Topics 18 and 19 are the final A Level topics.

| Topic | Outcome keys | Draft lesson packages | Status |
|---|---:|---:|---|
| 18 Classification, biodiversity and conservation | 18 | 3 | Draft content complete |
| 19 Genetic technology | 17 | 3 | Draft content complete |
| **Combined** | **35** | **6** | **Not yet published** |

The Topic 18 and Topic 19 assets use the syllabus outcome keys (for example, `18.2.4` and `19.1.8`) as stable identifiers. Those keys are the correct join key for curriculum mapping; UUIDs are version-specific.

## Live database inspection (2026-11-02)

The active Shadecode Student Supabase project was inspected read-only before the source registry update.

- A verified Cambridge Biology 9700 **2025–2027** curriculum version exists with 259 verified objectives.
- No Cambridge Biology 9700 **2028–2030** curriculum version or objective rows existed at the time of inspection.
- The 2025–2027 objective UUIDs belong to that older version. They must not be copied into 2028–2030 lesson assets or learner-progress records.
- The 2028–2030 source registry entry has now been registered in `public.curriculum_sources` with the official Cambridge PDF URL, stable source ID `cambridge-as-a-level-biology-9700-2028-2030`, and `auto_promote = false`.
- No curriculum document, version, objective, knowledge item, learner progress, or published asset rows were inserted or changed by this checkpoint.

## Required ingestion sequence

1. Run the existing **Curriculum Watch** workflow (manual dispatch or its scheduled run). It downloads the official PDF, extracts text, and records a SHA-256 source-byte fingerprint.
2. Confirm that the 2028–2030 source document is persisted with extracted text and that the curriculum version is created as `draft`.
3. Compare the extracted numbered outcomes against the official PDF, not only against the 2025–2027 database rows.
4. Resolve objective UUIDs from the new version using `curriculum_version_id` plus `objective_key`. Do not resolve by key alone across versions.
5. Add explicit outcome-to-lesson coverage and practical/assessment evidence. Keep all objective statuses in draft until reviewed.
6. Run the curriculum readiness report. The readiness gate requires source-byte fingerprint, extracted source text, complete coverage checks, verification evidence and verified objectives. Do not bypass it or set the version to verified merely to make assets appear.
7. Only after human verification should learning assets be published and learner-progress rows become available for that version.

## Existing automation

- `npm run watch:curriculum` downloads and extracts official source PDFs.
- `npm run ingest:curriculum` persists source snapshots, curriculum versions, objective rows and knowledge items. It requires `CURRICULUM_INGEST_ENABLED=true` plus the configured curriculum Supabase secrets.
- `npm run report:curriculum-readiness` is read-only and reports blockers. It does not promote versions.
- `.github/workflows/curriculum-watch.yml` runs the watcher and its tests on schedule or manual dispatch. Database ingestion is gated by `CURRICULUM_INGEST_ENABLED`.

## Release boundary

The Topic 18 and Topic 19 PRs remain draft-only. Their learning assets are not yet bound to a 2028–2030 `curriculum_version_id`, and no learner-facing publication has occurred. The next integration step is source ingestion and version-scoped UUID resolution, not manual UUID assignment or reuse of the 2025–2027 records.

## Official source

Cambridge International AS & A Level Biology 9700 syllabus for examinations in 2028, 2029 and 2030: https://www.cambridgeinternational.org/Images/744622-2028-2030-syllabus.pdf
