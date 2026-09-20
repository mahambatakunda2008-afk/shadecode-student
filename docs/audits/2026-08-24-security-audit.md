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

---

## 6. Follow-up (2026-09-19): flagged items closed or re-triaged

| Item | Result |
|---|---|
| `ADMIN_REVIEW_TOKEN` timing-unsafe comparison (`/api/admin/careers` POST) | **Fixed** — constant-time compare via `src/lib/auth/secret-compare.ts`. It already failed closed on an unset variable. |
| `ADMIN_SECRET` check on legacy `GET /api/feedback` | **Found worse than flagged, then retired (route deleted).** The guard compared against `` `Bearer ${process.env.ADMIN_SECRET}` ``: with the variable unset the expected value was the literal `Bearer undefined`, so that header returned every `feedback` row via the service-role client. It was first hardened (fail closed + constant-time), then deleted in the same session because it had **zero callers** (feedback is submitted via `/api/feedback-email`; admins read via the RBAC route `/api/admin/feedback`). If a script of yours called it, use `/api/admin/feedback` as a signed-in admin. |
| Upload route missing file-size cap | **Fixed** for the one route lacking it (`/api/admin/exam-hub/upload`, admin-only, 25 MB / 413, same limit as community submit). The other four upload routes already capped size. |
| `/api/cortex/event`, `/api/cortex/state` unauthenticated stubs | **Retired (routes deleted).** Verified no callers in `src` (including dynamically built URLs); neither wrote to a database. `lib/cortex/engine`'s `cortexAnalyze` is still used by the challenge generator and was kept. |
| `exam_logs`/`insights_archive` unused RLS-locked tables | Unchanged — product call. |
| Leaked-password-protection disabled | Unchanged — Supabase dashboard toggle, not code. |

**Exposure assessment (2026-09-20):** the owner confirmed `ADMIN_SECRET` was **not set** in production, so the `Bearer undefined` bypass on `GET /api/feedback` was live and reachable by anyone until the fix deployed. There was no real secret to rotate.
- *What was readable:* the whole `public.feedback` table via the service-role client: `id`, `user_id` (UUID), `type`, free-text `message`, `created_at`. No email or name columns. **8 rows** (2026-05-06 to 2026-08-30), all with a `user_id`. Message text is free-form and may contain whatever a student typed.
- *Evidence of access:* none found, but the evidence is thin. Supabase API logs (24 h window, source verified healthy: 2,692 edge events, 1,063 database API calls) show **no** requests to `rest/v1/feedback`. Vercel runtime logs returned nothing for any path, even for the last hour, so they neither confirm nor rule out access. Anything before the last ~24 h is not recoverable with the tools available.
- *Conclusion:* exposure was possible for months; exploitation is unproven either way. Low likelihood (obscure legacy route, no callers, tiny table) but not excluded. Route now deleted and the deletion confirmed live (production deployment `a1bc851`, READY).
- *Sweep for the same bug class:* no other route compares a request credential against a possibly-unset env var. All other `Authorization` readers verify a Supabase JWT via `auth.getUser(token)`, and all 17 `/api/admin/*` routes gate on `has_role` (fails closed on error) or, for careers, the now constant-time token check.

Regression coverage: `src/lib/auth/__tests__/secret-compare.test.ts`, `src/tests/server/api/admin-secrets.test.ts` (the `Bearer undefined` and oversize-upload cases fail against the pre-fix routes).

---

## 7. Follow-up (2026-09-20): leaderboard integrity hole on `profiles`, found via the Supabase advisor

The advisor flagged two SECURITY DEFINER functions callable by signed-in users (`increment_xp`, `upsert_revision_item`). Reading their bodies showed both already had ownership guards (so no cross-user tampering), but `increment_xp` accepted any `amount`, and following that thread found the larger problem:

| Finding | Detail |
|---|---|
| **Any signed-in student could set their own `xp`, `level`, `streak`, `weekly_xp`, `season_xp`, `current_season`, ranks, `division`, `movement`** | The policies "Users can manage own profile" (ALL) and "Users can update own profile" allow updating your own row, the `authenticated` role had column `UPDATE` on those fields, and no trigger guarded them. One `supabase.from('profiles').update({ xp: 999999999 })` from the browser console would top the public leaderboard (`/leaderboard` ranks by `profiles.xp`). Delete-and-reinsert of the own row (policy is ALL) was a second route. |
| `increment_xp` callable by `authenticated` with any amount | Second route to the same result (ownership check limited it to your own row, not the amount). Every real caller is server-side (`awardXP*` uses the service-role client); the browser-side `awardXPClient` had no callers. |
| No premium/plan/credit/role columns on `profiles` | Checked all 34 columns; the hole is limited to competitive integrity, not paid features or privilege escalation. |

**Fix (migration `20260920092654_protect_profiles_competitive_columns`, applied to production and committed):** a `BEFORE INSERT OR UPDATE` trigger pins the ten competitive columns for browser roles (`authenticated`, `anon`) by *ignoring* the write rather than raising, so the signup upsert (which sends `level/xp/streak`) and stale cached PWA bundles keep working. `service_role`, SECURITY DEFINER functions (`increment_xp`, `handle_new_user`) and cron/migrations run as other roles and pass through. `EXECUTE` on `increment_xp` revoked from `authenticated`. Dead `awardXPClient` removed. A column-level `REVOKE` was rejected because it would have broken new signups (the browser upsert includes those columns) and any cached client. Rollback SQL is in the migration header.

**Verification:**
- Trigger logic tested in a throwaway table inside a transaction forced to roll back: 7 checks (privileged insert untouched; `authenticated` update cannot change any competitive column but can still change `username`; inflated insert forced to defaults; upsert cannot inflate or reset; a SECURITY DEFINER award still works when called by a browser user; `anon` blocked; `service_role` passes).
- Then against the **real** `profiles` table, also rolled back by design: an own-row update of xp/level/streak/season_xp/weekly_xp/division executed (1 row) but changed nothing, and `increment_xp` was denied to `authenticated`.
- Catalog re-check after applying; advisor re-run: the `increment_xp` finding is gone (2 findings → 1).

**Was it exploited?** No sign. 62 profiles; max XP 1,074 at level 11 (exactly `floor(1074/100)+1`); zero level/XP mismatches (`increment_xp` always keeps them consistent, so direct writes would show as mismatches); zero extreme values (xp > 20000, streak > 400, level > 200); season/weekly XP and rank fields all still defaults. A cheater who set small consistent values would not be detectable this way.

**Left as is, deliberately:** `upsert_revision_item` (client-callable by design, correct ownership guard; worst case a student inflates their own revision priority) and the Supabase leaked-password-protection toggle (dashboard setting, not code). Note `weekly_xp`, `season_xp`, `division`, `movement` and rank columns are not written by anything in this repo today; if a job outside the repo maintains them it must use the service role, which the trigger allows.

