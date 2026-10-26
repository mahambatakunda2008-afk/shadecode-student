# Published learning asset editorial workflow

The canonical library is intentionally separate from learner-generated lessons and the legacy shared lesson cache. An asset is never learner-visible merely because it exists in the database.

## Access control

Set the server-only Vercel environment variable `PUBLISHED_ASSET_EDITOR_EMAILS` to a comma-separated allowlist of verified account email addresses for trusted editors. Do not prefix it with `NEXT_PUBLIC_`. Redeploy after changing it.

The editorial API rejects users who are not on that allowlist:
- `GET /api/library/editor?status=draft` lists up to 100 assets in one review state.
- `POST /api/library/editor` creates a draft against an existing curriculum version whose status is `verified`.
- `PATCH /api/library/editor` changes the review state for an existing asset. Only an allowlisted editor can call these routes.

The learner-facing `GET /api/library/published` endpoint remains read-only and returns only approved, published assets for the learner's resolved curriculum.

## Draft payload

Example shape, using placeholder values that must be replaced with real identifiers and evidence:

```json
{
  "curriculum_version_id": "REPLACE_WITH_VERIFIED_CURRICULUM_UUID",
  "asset_key": "physics-9702-wave-speed-worked-example",
  "asset_version": 1,
  "asset_type": "worked_example",
  "title": "Determining wave speed from frequency and wavelength",
  "subject_id": "physics",
  "topic_key": "waves",
  "objective_keys": ["REPLACE_WITH_REAL_OBJECTIVE_KEY"],
  "content": {
    "learning_objectives": [],
    "sections": [],
    "worked_examples": [],
    "practice": [],
    "visual_tasks": []
  },
  "provenance": {
    "source_reference": "Identify the exact syllabus document/page/section or trusted source used"
  },
  "quality_checks": {
    "syllabus_checked": false,
    "factual_accuracy_checked": false,
    "assessment_checked": false,
    "accessibility_checked": false,
    "review_notes": []
  }
}
```

This is a payload contract, not a completed lesson. Never publish placeholder content, invented objective keys, or an unverified curriculum mapping.

## Required review evidence

Before transitioning an asset to `approved`, the editorial API requires:
- `provenance.source_reference` identifying the exact source used.
- `quality_checks.syllabus_checked = true`.
- `quality_checks.factual_accuracy_checked = true`.
- `quality_checks.assessment_checked = true`.
- `quality_checks.accessibility_checked = true`.
- At least one substantive string in `quality_checks.review_notes` (12 characters or more).

The review gate is a minimum process check, not an automatic proof that the lesson is correct. A human editor must actually perform each check. For applicable topics, inspect diagrams, graph axes/units, experimental methods, worked reasoning, command words, mark-scheme expectations, and accessibility/low-data presentation.

A review-state change to `approved` records the authenticated editor and timestamp and sets `published_at`. Other states are not returned to learners. Use `rejected` for failed review and `retired` to remove a previously published asset from learner retrieval. When editing content after approval, create a new version and review it again rather than silently changing a published version.

## Existing shared lesson records

The current `lesson_library` rows have incomplete topic/curriculum metadata and include duplicate titles. They must not be copied wholesale into this table. For each candidate, inspect its source `learn_lessons` row, blocks, subject mapping, syllabus provenance, objective mapping, and duplicate status. Keep it in the legacy library until those checks support a specific verified curriculum version and topic key.
