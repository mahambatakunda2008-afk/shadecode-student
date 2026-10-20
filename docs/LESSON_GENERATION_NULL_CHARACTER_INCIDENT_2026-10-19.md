# Lesson-generation incident: null-character persistence regression

Date: 2026-10-19

## Observed production signal

The Vercel runtime-error summary for the preceding seven days reported repeated failures on `/api/learn` with:

`Atomic lesson finalization failed: null character not permitted`

The grouped cluster showed 10 occurrences affecting 2 users, with the latest event at 2026-10-19 05:21 UTC. This is a persistence-stage failure: lesson generation can finish, but PostgreSQL rejects text/JSON containing U+0000 when the final checkpoint is written.

The same runtime summary also showed provider-chain exhaustion, provider aborts, and a Gemini 503 cluster. Those are separate reliability signals and must not be conflated with the null-character persistence bug.

## Existing mitigation

`src/lib/cortex/sanitizeLessonText.ts` recursively removes U+0000 from strings, arrays, object values, and object keys. The Learn route applies it to generated payloads and fields sent through atomic checkpoint finalization.

The production error cluster's last event points to an older deployment. The current production deployment is newer, so the historical count is not evidence that the same error is still occurring after the mitigation. Recheck fresh runtime errors after deployment before declaring the incident active or resolved.

## Regression coverage added

The accompanying unit tests verify that:

- actual U+0000 characters are removed from strings;
- nested lesson blocks and metadata are sanitized recursively;
- object keys are sanitized too;
- valid newlines, punctuation, and Unicode science symbols survive unchanged.

## Acceptance criteria

1. Typecheck, lint, unit tests, and production build pass on the exact PR head.
2. A generated lesson can be finalized and retrieved from `learn_lessons` without the null-character database error.
3. Fresh production telemetry is checked after the relevant code is deployed.
4. Provider timeouts and provider-chain exhaustion remain a separate workstream. A successful persistence test does not prove AI generation reliability.

No production data, database schema, or production deployment is changed by this regression-test PR.
