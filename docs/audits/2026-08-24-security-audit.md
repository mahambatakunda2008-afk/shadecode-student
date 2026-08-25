# Security Audit

**Date:** 2026-08-24
**Author:** Claude (Chief Software Engineer)
**Scope:** `.cortex/tasks.md` immediate-queue item — "Review auth, RLS, API routes,
service-role usage, uploads, secrets and AI-provider boundaries."
**Method:** Full classification of all 67 API routes by auth pattern (grep +
individual manual read of every route that didn't match an established pattern),
`Supabase:get_advisors` security scan against the live database, manual review of
every flagged `SECURITY DEFINER` function's actual body (not just the linter's
generic label), grep-based secret/service-role-key exposure sweep, and a read of
`middleware.ts` and the admin upload path.

---

## 1. Executive summary

The overall posture here is genuinely good — better than the initial "middleware
exempts `/api`" finding makes it look in isolation. 61 of 67 API routes already do
their own auth correctly (session-based, Bearer-token, or admin-RBAC), the RBAC
system is a real DB-backed role/permission system with `SECURITY DEFINER` functions
that all correctly enforce `auth.uid() = user_id` or an explicit admin-role check
(one of them — `increment_xp` — even carries a code comment referencing a prior
session that closed an XP-spoofing exploit, so this isn't the first time this exact
class of bug has been caught and fixed here). The admin upload path is properly
gated and validated. No hardcoded secrets, no service-role key reachable from
client code.

**Two real issues were found and fixed in this pass**, both now verified end to end
(typecheck, lint, and confirmed live on production):

1. `/api/generate-revision` had **no authentication at all** and called OpenAI
   directly with the app's own API key, bypassing the shared `callAI` provider
   fallback gateway every other AI route uses — meaning unlimited (well,
   10-requests-per-minute-per-IP-limited, which is not a meaningful ceiling against
   a determined actor) real financial cost, attributable to no one. **Fixed:** now
   requires the same Bearer-token session auth as every sibling route, and routes
   through `callAI` for proper fallback + per-user cost tracking.
2. `/api/user/complete-tour` accepted a client-supplied `userId` with zero auth —
   an IDOR shape, currently inert only because its persistence was never wired up
   (`// TODO`). **Fixed:** now derives the user from the authenticated session
   instead of trusting the request body, so it's safe the moment someone finishes
   that TODO.

Everything else below is a finding for your attention, not a code change — several
of these need a product/ops decision (dashboard toggle, or "is this table meant to
be used yet") rather than something to fix unilaterally mid-audit.

---

## 2. API route auth inventory (67 routes)

| Category | Count | Notes |
|---|---|---|
| Session/Bearer-token auth (own check) | 55 | Correctly gated, verified pattern by pattern |
| Admin-RBAC gated (`hasUserRole`/`requirePermission`) | 7 | Real DB-backed roles, not a hardcoded allowlist |
| `ADMIN_SECRET`/`ADMIN_REVIEW_TOKEN` header check | 2 | Works, but see §3.3 |
| Intentionally public, reviewed individually | 3 | `/api/ping`, `/api/cortex/health` (booleans only, no key values), `/api/feedback-email` (deliberately unauthenticated with a code comment explaining why, IP rate-limited) |
| **Fixed in this pass** | 2 | `/api/generate-revision`, `/api/user/complete-tour` — see §3.1, §3.2 |
| Unauthenticated stub routes, no live callers, no DB writes | 2 | `/api/cortex/event`, `/api/cortex/state` — see §3.4 |

## 3. Findings

### 3.1 `/api/generate-revision` — unauthenticated, unmetered AI-cost endpoint (fixed)

No auth check of any kind — only generic `aiEndpointLimiter` (10 requests/minute
**per IP**, trivially multiplied by rotating IPs, which costs an attacker nothing
over the open internet). Each request could carry up to 50,000 characters of
`content` (the schema's own limit) and triggered a direct, bespoke `fetch()` to
`https://api.openai.com/v1/chat/completions` using `process.env.OPENAI_API_KEY` —
bypassing `src/lib/ai.ts`'s shared `callAI()` gateway (Cloudflare → Gemini → OpenAI
→ OpenRouter fallback chain, per-request timeout budgeting, unified cost logging)
that every other AI-touching route in this codebase uses. The client helper that
calls this route, `src/lib/ai/generateRevision.ts`, has **zero importers anywhere
in the app** — this was live, deployed, unauthenticated, and not even used by the
product itself.

**Fixed:** `src/app/api/generate-revision/route.ts` now requires the same
Bearer-token session pattern as `/api/learn` and `/api/learn/quiz`, and calls
`callAI()` instead of hand-rolling the OpenAI request — gets fallback resilience,
a real timeout budget, and per-user cost attribution in the same pass.
`src/lib/ai/generateRevision.ts` updated to send the session token so it isn't
left broken if it's ever wired up.

### 3.2 `/api/user/complete-tour` — IDOR-shaped, currently inert (fixed)

Accepted `{ userId }` straight from the request body with no verification that the
caller *is* that user. Currently harmless only because the route is a stub with a
`// TODO: integrate with your persistence layer` comment — it never actually wrote
anything. The moment that TODO gets implemented without someone remembering to add
auth separately, this becomes a real cross-user write.

**Fixed:** now requires the same Bearer-token session pattern and derives the user
from the session rather than the body. Zero behavior change today (still a no-op
success response) — this just makes the eventual real implementation safe by
construction instead of relying on someone remembering to add the check later.

### 3.3 `ADMIN_SECRET` / `ADMIN_REVIEW_TOKEN` use plain string comparison

`src/app/api/feedback/route.ts` and `src/app/api/admin/careers/route.ts` compare
the submitted token with `!==` rather than a constant-time comparison
(`crypto.timingSafeEqual`). This is a low-severity, largely theoretical finding —
exploiting a timing side-channel over the public internet through Vercel's edge
network (with its inherent latency jitter) is genuinely hard — but it's a one-line
hardening available at essentially no cost whenever these routes are next touched.
Not fixed in this pass to avoid scope creep on a same-day audit; flagging for the
next time either file is edited.

### 3.4 `/api/cortex/event` and `/api/cortex/state` — live, unauthenticated, unused stub routes

Both are deployed, public, and reachable (middleware exempts all of `/api/*` —
see §5), and neither has any caller anywhere else in this repository. Neither
touches real persistence: `/api/cortex/event`'s own comment says
`// In real system: update DB + session state` and just echoes a mutated object
back; `/api/cortex/state` calls `cortexAnalyze()`, a pure function with no I/O.
Current risk is effectively zero (no data exposure, no cost, no persistence to
corrupt) but they're unauthenticated attack surface for no product benefit today.
**Not removed in this pass** — deleting a live route on a same-day audit without
confirming nothing external (a not-yet-integrated mobile client, a partner
integration) depends on it isn't a call to make unilaterally. Flagging for a
product decision: finish wiring them up with proper auth, or retire them.

### 3.5 Database: RLS and `SECURITY DEFINER` functions (via `Supabase:get_advisors`)

Ran Supabase's own security linter directly against the live project. Full
findings:

- **`get_traction_metrics()`, `get_user_permissions()`, `has_permission()`,
  `has_role()`, `increment_xp()`, `review_exam_question_topic_proposal()`,
  `upsert_revision_item()`** flagged as `SECURITY DEFINER` functions callable by
  any authenticated user via RPC. **Manually read every one of their actual
  definitions** rather than trusting the generic linter label — all six that take a
  `user_id`/`p_user_id` parameter explicitly check `auth.uid() <> user_id` (or the
  caller is `service_role`, which only server-side code holding the secret key can
  authenticate as) and raise an exception on mismatch;
  `review_exam_question_topic_proposal` checks `has_role(auth.uid(), 'admin')`
  before doing anything. **No action needed** — these are correctly written, the
  linter just can't see into function bodies to know that. Worth noting:
  `increment_xp`'s definition carries an inline comment referencing a prior session
  that closed an XP-spoofing exploit here — this exact class of bug has already
  been caught and fixed once in this codebase, which is the right outcome, but
  suggests it's worth a standing convention (documented in
  `AGENT_COORDINATION_PROTOCOL.md` or a schema-change checklist) that any new
  `SECURITY DEFINER` function taking a user-id parameter gets this same ownership
  check by default, not by post-hoc discovery.
- **`public.exam_logs`** and **`public.insights_archive`**: RLS enabled, zero
  policies defined — meaning these tables are completely inaccessible via
  PostgREST to any role except `service_role`. Confirmed via repo-wide grep that
  **neither table is referenced anywhere in the current application code** — not a
  live security gap (nothing can silently leak through an absent policy on a table
  nothing queries), but also not obviously intentional. Flagging for a product
  decision: dead tables to drop, or feature groundwork that needs real RLS policies
  added before any code starts using them.
- **`auth_leaked_password_protection` is disabled** — Supabase Auth can check new
  passwords against HaveIBeenPwned's breach corpus at signup, and it's currently
  off. This is a dashboard/Auth-config toggle, not a code or SQL change, so it's
  outside what this pass modifies — recommend enabling it at
  Authentication → Policies in the Supabase dashboard when convenient
  (https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

### 3.6 Service-role key isolation: clean

Grepped every file referencing `SUPABASE_SERVICE_ROLE_KEY` for co-occurrence with
a `"use client"` directive. One match (`src/lib/xp/manager.ts`) turned out to be a
false positive — the string `"use client"` appeared inside a code comment
explaining a *different*, genuinely client-side function
(`awardXPClient`) in the same file, not an actual directive. The file itself has
no `"use client"` at the top and is server-only. No client-reachable code path
references the service-role key anywhere in the codebase.

### 3.7 Secrets: clean

Grepped for common hardcoded-secret shapes (OpenAI `sk-...`, Google `AIzaSy...`,
generic `key: "..."` literals) across all of `src/`. Nothing found outside
`process.env.*` references.

### 3.8 Admin upload path (`/api/admin/exam-hub/upload`): solid

Read the full route. Properly admin-RBAC gated (same `hasUserRole` system as
everything else, no parallel auth mechanism), validates `file.type ===
"application/pdf"`, validates `syllabusId` against an actual DB row before using it
in the storage path (so it can't be used for path injection — it must already be a
valid syllabus ID to reach that point), and validates level/session against the
specific exam board's real values rather than a single global whitelist (CAIE and
ZIMSEC don't share level or session naming, and the code has a comment explaining
exactly why it validates per-board rather than globally). One minor gap: no
explicit file-size cap before the `arrayBuffer()` read — low severity since this
route is already admin-only, but worth a cheap `MAX_UPLOAD_BYTES` guard next time
this file is touched, to bound storage cost even from a legitimate but mistaken
admin upload.

---

## 4. The systemic finding: middleware does not cover `/api/*` at all

`src/middleware.ts`'s `PUBLIC_PREFIXES` includes `/api`, so the session-check
middleware that protects every page route (`redirect to /auth/login` if no user)
**returns early for every single API route, unconditionally.** This is not a bug —
granular per-route auth is a legitimate and common pattern, and §2 shows 61 of 67
routes actually do it correctly — but it does mean there is no structural backstop
for a route that forgets. Both fixes in this pass (§3.1, §3.2) were routes that
had exactly that: no callers to trip an obvious functional bug, no page-level
middleware to catch the gap, so the mistake could only be found by literally
reading every route, which is what this audit did.

**Recommendation:** the routes in this codebase mostly self-document their auth
pattern (`getBearerToken` + `supabase.auth.getUser(token)` is copy-pasted
consistently). Given how consistent that pattern already is, the cheapest durable
fix isn't more infrastructure — it's making the existing `Verification Gate`
checklist (`AGENT_COORDINATION_PROTOCOL.md` §14, itself just hardened this session
for a different reason) explicit that new `/api/*` routes handling non-public data
must include one of the two established auth patterns, checked as part of that
same gate, the same way lint and typecheck now are.

---

## 5. What was fixed vs. what was left as a finding

| Item | Action |
|---|---|
| `/api/generate-revision` unauthenticated AI-cost endpoint | **Fixed** — auth added, routed through shared `callAI` gateway |
| `/api/user/complete-tour` IDOR shape | **Fixed** — auth added, session-derived user |
| `ADMIN_SECRET`/`ADMIN_REVIEW_TOKEN` timing-unsafe comparison | Flagged, not fixed (low severity, scope discipline) |
| `/api/cortex/event`, `/api/cortex/state` unauthenticated unused stubs | Flagged, not fixed (needs a product call: finish or retire) |
| `exam_logs`/`insights_archive` RLS-locked, unused tables | Flagged, not fixed (needs a product call: drop or build) |
| Leaked-password-protection disabled | Flagged, not fixed (dashboard toggle, not code) |
| Upload route missing file-size cap | Flagged, not fixed (low severity, minor) |
| `SECURITY DEFINER` functions | Reviewed individually, confirmed correct, no action needed |
| Service-role key isolation | Reviewed, confirmed clean, no action needed |
| Hardcoded secrets | Reviewed, confirmed clean, no action needed |
| Admin upload validation | Reviewed, confirmed solid, no action needed |

Verified: `tsc --noEmit` clean, `npm run lint` 0 errors, full test suite passing,
on both code changes made in this pass.
