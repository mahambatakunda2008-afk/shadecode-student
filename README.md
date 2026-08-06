# Shadecode Student

An AI-powered academic operating system for Zimbabwean students (Cambridge and ZIMSEC curricula), built as a Progressive Web App.

Shadecode Student combines AI tutoring, exam simulation, past papers, adaptive learning, gamification, analytics, and Cortex intelligence into one learning platform.

## Core Features
- AI lessons and tutoring
- Exam Simulation with automated marking
- Exam Hub: searchable past-paper question bank with community upload/moderation
- Weak-topic detection and personalized revision
- Cortex learning intelligence (insights, achievements, recommendations)
- XP, achievements, streaks and leaderboards
- Tasks, timetables and analytics
- Careers explorer

## Tech Stack
- **Framework:** Next.js (App Router, Turbopack) + TypeScript
- **Database/Auth:** Supabase (Postgres, RLS, Auth)
- **AI provider chain** (in fallback order): Cloudflare Workers AI (primary, free tier) → Gemini 2.5 Flash (3 rotating keys) → OpenAI (last resort, unfunded) → OpenRouter
- **Error monitoring:** Sentry
- **Deployment:** Vercel
- **PWA:** offline support via `@ducanh2912/next-pwa`
- **Testing:** Vitest
- **CI:** GitHub Actions — typecheck, test, and build run on every push/PR to `main`

## Getting Started

```bash
npm install
npm run dev
```

Requires the environment variables below to be set in `.env.local`.

### Environment Variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-only, bypasses RLS) |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Primary AI provider |
| `GEMINI_API_KEY`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3` | Secondary AI provider (all 3 share one Google account's quota pool) |
| `OPENAI_API_KEY` | Last-resort AI provider (unfunded by design, expect 429s) |
| `OPENROUTER_API_KEY` | Final AI fallback |
| `RESEND_API_KEY`, `FEEDBACK_EMAIL` | Transactional/feedback email |
| `ADMIN_REVIEW_TOKEN`, `ADMIN_SECRET` | Token-based admin endpoints (most admin routes instead use RBAC via `hasUserRole`) |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL` | Site/API base URLs |

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (runs `next-sitemap` as `postbuild`) |
| `npm run start` | Serve a production build |
| `npm test` | Run the Vitest suite |
| `npm run lint` | ESLint |
| `npm run test:curriculum` | Standalone curriculum data test script |

## Database

Schema and RLS policies live in `supabase/migrations/`. Apply in order via the Supabase CLI or MCP tooling. See `docs/AUDIT_2026-08.md` for a record of past migration-drift issues and how they were resolved.

## Autonomous Agent

`.cortex/cortex-engine.js` runs on a schedule via `.github/workflows/cortex.yml` with `contents: write` and `pull-requests: write` permissions — it can push commits and open PRs autonomously using Gemini/OpenRouter. **Confirmed working as of 2026-08-05** after fixing three real bugs (Node 20's missing native WebSocket support, a dead OpenRouter fallback never wired into the workflow's env, and no retry on transient Gemini 503s) — verified via a real triggered run that opened PR #77. Still review every PR it opens before merging; it's unsupervised, not unreviewed-by-design. See `docs/ARCHITECTURE.md` for the full debugging history.

## Roadmap / Vision

Shadecode Student is evolving from an AI study assistant into a complete learning operating system where every lesson, question, exam and study session helps Cortex understand the learner and deliver increasingly personalized guidance.

## Contributing

No CODEOWNERS or PR template exists yet. If contributing, run `npm run lint`, `npx tsc --noEmit`, and `npm test` locally before opening a PR — CI will run the same checks.
