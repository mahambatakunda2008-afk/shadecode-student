# Architecture

This describes how Shadecode Student is actually built, verified against
the repository rather than aspirational — see `docs/AUDIT_2026-08.md` and
`docs/FINAL_AUDIT_REPORT_2026-08.md` for how each claim here was checked.

## System overview

Next.js App Router (TypeScript, Turbopack) deployed on Vercel, backed by
Supabase (Postgres + Auth + Storage). Authenticated app routes live under
`src/app/(app)/`; the layout there is a Client Component that gates access
via `useSession()` and Supabase's browser client.

## Auth model

- **Client-side:** `src/lib/supabase/client.ts` — browser client, respects RLS, used by Client Components for direct table reads/writes scoped to the logged-in user.
- **Server-side (session-respecting):** `src/lib/supabase/server.ts` — SSR client for API routes that need to know *who's calling*, still respects RLS.
- **Server-side (elevated):** `src/lib/supabaseClient.js` — raw client with the service-role key, bypasses RLS entirely. Used deliberately in specific server routes (admin reports, cross-user aggregation) — every route using this **must** gate access itself, since RLS won't. See `src/lib/auth/rbac.ts`'s `hasUserRole()` for the standard pattern.
- **Admin auth has three coexisting conventions** (RBAC via `hasUserRole`, `ADMIN_REVIEW_TOKEN`, `ADMIN_SECRET`) — all currently safe, not yet consolidated. See backlog.

## AI provider chain

`src/lib/ai.ts` is the single entry point (`callAI()`) for every AI-backed
feature. Fallback order, in priority: **Cloudflare Workers AI** (primary,
free tier) → **Gemini 2.5 Flash** (3 keys sharing one quota pool;
`gemini-2.0-flash` was removed from the chain, permanently zero-quota on
this account) → **OpenAI** (last resort, deliberately unfunded, expect 429s)
→ **OpenRouter** (final fallback). This order matters: OpenAI sitting
earlier previously wasted a full round-trip on every call before this was
fixed.

`.cortex/cortex-engine.js` is a **separate**, older implementation with its
own Gemini model list — not routed through `ai.ts`. Kept in sync manually
(the zero-quota model removal had to be applied to both places).

Every route that calls into the AI chain should apply rate limiting via
`@/lib/rate-limit/limiter`'s `applyRateLimit()` — check this when adding a
new AI-backed route; it's not automatic.

## Cortex system

"Cortex" is the umbrella name for the learning-intelligence layer:
- `src/lib/cortex.ts` — event emission (`emitCortexEvent`), insight recording (`recordCortexInsight`, writes to `cortex_insights`), exam-driven updates (`updateCortexFromExam`)
- `src/lib/cortex/achievements.ts` — achievement logic, calls into `src/lib/xp/manager.ts`
- `src/lib/xp/manager.ts` — deliberately splits `awardXP`/`awardXPBySource` (service-role, for server routes) from `awardXPClient` (browser client, RLS-scoped) — **do not merge these**, the split exists specifically because a browser client has no cookies/session in a server route context
- `.cortex/cortex-engine.js` — the autonomous scheduled agent (see below), architecturally separate from the runtime Cortex system above despite the shared name

## The autonomous Cortex Engine (operational, not architectural)

`.github/workflows/cortex.yml` runs `.cortex/cortex-engine.js` on a
schedule with `contents: write` + `pull-requests: write` — it can push
commits and open PRs using its own Gemini/OpenRouter calls, unsupervised.

**Confirmed working as of 2026-08-05.** Three real bugs were found and
fixed via a live-log-paste debugging loop with Takunda (raw Actions log
text isn't reachable via API from this environment, only through the UI):
1. Node 20 lacks native WebSocket support; `createClient()` unconditionally initializes a Realtime client that needs it even though this script never uses realtime features — fixed by bumping the workflow to Node 22.
2. `OPENROUTER_API_KEY` existed as a repo secret but was never passed into this job's env block, so the already-coded OpenRouter fallback was silently dead — wired in.
3. A single Gemini attempt gave up immediately on transient 503s ("high demand") — added a short retry before falling through to OpenRouter.

Verified end-to-end via a real triggered run: schema discovery → data
gathering → AI decision (via OpenRouter, since Gemini was still
503'ing that day) → PR opened (#77). Still worth reviewing every PR it
opens before merging — it's an unsupervised LLM writing code directly
against `main`'s history, not a substitute for review.

## Database

Schema and RLS policies live in `supabase/migrations/`, applied
sequentially. **Migration files are not guaranteed to reflect live
database state** — this audit found 5 tables with correct RLS live that
had no matching migration file (applied via dashboard/SQL editor directly
at some point). Always verify against the live database
(`pg_class.relrowsecurity`, `pg_policies`) before assuming migration
history is authoritative.

## CI/CD

`.github/workflows/ci.yml` runs typecheck (`tsc --noEmit`), tests (`vitest
run`), and a real `next build` on every push/PR to `main`. Requires
`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as GitHub
Actions repo secrets (separate from Vercel's env vars — this caused a real
build failure before being fixed).

## Known architectural fragility

No page anywhere in the app sets `export const dynamic`, so authenticated
routes are statically prerendered by default at build time — works today
because the required env vars are present, but is fragile (see backlog).
Most `(app)/*` pages are Client Components, which complicates a
straightforward fix — route segment config like `dynamic` is
Server-Component-only in Next.js, so this needs a considered approach
rather than a blanket one-line change.
