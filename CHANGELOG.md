# Changelog

All notable changes to Shadecode Student are documented here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] — 2026-08 audit sessions (unreleased)

### Security
- Fixed 3 admin API routes (`ai-usage-report`, `ai-cost-report`, `ai-anomalies`) that used the Supabase service-role key with zero authentication — any URL holder could read AI usage logs including per-user data (`54a0f00`)
- Enabled RLS on `insights_archive`, the one table confirmed genuinely missing it after checking the live database directly (`9987c58`)
- Added rate limiting to `cortex/generate-lesson`, the one AI-calling route missing it (`7899429`)

### Fixed
- Task-completion insights were silently failing to persist due to a module-resolution collision between `src/lib/cortex.js` and `.ts` (`d10dee9`)
- AI provider fallback order violated documented priority, wasting a full OpenAI round-trip on every AI call before reaching Gemini (`d0611b1`)
- Removed `gemini-2.0-flash` from the fallback chain — permanently zero-quota, pure wasted latency (`bc3ec9a`)
- Timetable save could silently wipe a user's schedule on a failed insert with no error surfaced (`ca0d73b`)
- Restored `@emotion/react`/`@emotion/styled` after incorrectly removing them as "unused" — they're peer dependencies of `@mui/material`, this broke 4 production deployments (`b4fe6d4`)

### Added
- First real CI workflow: typecheck, test, and build on every push/PR to `main` (`08e4aaf`, secrets configured in `bb68e7e`)
- `docs/AUDIT_2026-08.md` — running record of audit findings
- Rewrote README with verified tech stack, env vars, scripts, and setup instructions (`eddf39e`)
- CODEOWNERS, pull request template, SECURITY.md

### Removed
- Dead code and broken artifacts: unreachable `lib/supabase/server.ts`, empty orphan directory, dead duplicate `TourContext.tsx`, a malformed-shell-command artifact, two 0-byte files masquerading as API routes (`bf26d36`)
- Unused dependencies: `@mui/icons-material`, `js-cookie`, `tw-animate-css` (`92c1fed`)

### Known issues (not yet resolved)
- The autonomous Cortex Engine (`.cortex/cortex-engine.js`, runs every 6h via `.github/workflows/cortex.yml`) has failing runs with a cause not yet identified — ruled out missing secrets, root cause still open
- No page in the app sets `export const dynamic`; authenticated routes are statically prerendered by default, which works today but is fragile
- `exam/mark` scoring has no clamp on AI-returned per-question scores against each question's max marks (theoretical >100% edge case)
