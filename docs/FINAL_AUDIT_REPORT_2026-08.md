# Final Engineering Audit Report — Shadecode Student
**Period:** August 2026 multi-session audit · **Commit range:** `bf26d369..efd8f6a` (18 commits)

## Executive Summary

This audit moved Shadecode Student from "no automated safety net, undocumented
security gaps, silent data-loss bugs" to a repository with real CI, a closed
unauthenticated data-exposure hole, four fixed production bugs, and accurate
documentation. It also caught and fixed a regression it introduced itself
(emotion peer dependencies), and explicitly corrected two of its own earlier
conclusions rather than letting them stand uncorrected — this record is
preserved below and in `docs/AUDIT_2026-08.md`.

**Bottom line:** the app is functionally solid where it's been touched. It is
not yet release-managed (no prior versioning, no CHANGELOG until this
session) and has two unresolved operational risks: the autonomous Cortex
Engine's failure cause, and the lack of `dynamic` route config anywhere in
the app (currently masked by correct CI/Vercel env vars, not actually fixed).

## Repository Health: **Good, improving**
18 real commits, every one verified against actual production deployment or
live database state before being called "done" — not just local build
success. Two self-corrections on record, both caught before shipping bad
fixes (an RLS migration that would have overwritten good live policies; a
missing-secret theory for the Cortex Engine ruled out by checking actual
secret names via API).

## Security: **Materially improved, one open item**
- Fixed: unauthenticated admin data exposure (3 routes, service-role key, zero auth) — `54a0f00`
- Fixed: `insights_archive` RLS gap, verified live — `9987c58`
- Verified clean: every other service-role-using route has a real auth gate
- Verified clean: XP/Achievements/Leaderboard's client-selection logic (server routes use service-role, browser calls use RLS-scoped client — correctly separated)
- Closed as non-issue (user decision): `.env.local` git-history exposure — `HF_API_KEY`/`UPSTASH_REDIS_REST_TOKEN` confirmed unused anywhere in the current codebase
- **Open:** no systematic pass on input validation across all API routes (spot-checked several, not exhaustive)

## Data Integrity: **Materially improved**
- Fixed: task-completion insights silently not persisting (module resolution collision) — `d10dee9`
- Fixed: timetable save could wipe data with no error surfaced — `ca0d73b`
- Minor open item: exam marking has no clamp on AI-returned scores vs. question max (theoretical edge case, not observed in practice)

## Performance: **One real fix, chain now matches policy**
- Fixed: AI fallback order was violating stated priority, wasting a full OpenAI round-trip on every call — `d0611b1`
- Fixed: `gemini-2.0-flash` removed, permanently zero-quota, pure waste — `bc3ec9a`
- Fixed: rate limit added to the one AI route missing it — `7899429`
- **Not done:** bundle size analysis, caching strategy review, DB query pattern audit

## Documentation: **Rebuilt from near-zero**
- README rewritten with verified facts (was 25 lines, missed the real AI chain, Sentry, PWA, CI, env vars entirely)
- `docs/AUDIT_2026-08.md` — full findings record
- CHANGELOG.md — added this session, retroactively documents the audit
- SECURITY.md — added this session
- **Not done:** architecture docs, landing page copy audit

## Testing: **CI exists now; coverage still thin**
3 real Vitest test files (`student-intelligence`, `recommendation-engine`,
`events/pipeline`), confirmed passing in real CI. No test coverage for API
routes, no E2E, no accessibility testing tooling installed.

## CI/CD: **Went from nothing to a working gate**
`.github/workflows/ci.yml` added (`08e4aaf`), secrets configured directly via
API using values pulled from Supabase (`bb68e7e`), confirmed green across 5
subsequent commits. The pre-existing autonomous Cortex Engine workflow
remains unresolved — see Outstanding Risks.

## Platform Readiness: **Web/PWA only, by design scope not gap**
PWA manifest verified fully intact (every icon/screenshot/privacy-policy
reference resolves to a real file). No Capacitor/Electron/Tauri/native
Android project exists — this was true before the audit and remains true;
would be new work, not a fix.

## Release Readiness: **Not yet formally release-managed**
Was true before this session (no version discipline, no CHANGELOG) — now has
both, starting at `0.2.0`. Still pre-1.0 by design given open items below.

## Technical Debt
- No `export const dynamic` anywhere in the app — authenticated routes are statically prerendered by default. Works today because required env vars are present in both Vercel and CI, but is fragile: the next env var typo would produce the exact build failure seen this session.
- The Cortex Engine's actual failure cause is unresolved.
- Three distinct admin-auth conventions exist in the codebase (`hasUserRole` RBAC, `ADMIN_REVIEW_TOKEN`, `ADMIN_SECRET`) — all currently safe (fail closed / correctly gated), but worth consolidating to one pattern eventually.
- `insights_archive`, `generated_course_approvals` are dormant/audit-only tables with RLS but no application code path — fine as-is, just noting they exist.

## Outstanding Risks

| Item | Severity | Status |
|---|---|---|
| ~~Cortex Engine failing runs, cause unknown~~ | ~~Medium~~ | **RESOLVED (2026-08-07)** — fixed and verified via PR #77; confirmed via Actions API, 7 consecutive successful runs 2026-08-05 07:08 through 2026-08-06 14:24, only failure immediately precedes the fix. No longer a release blocker. |
| ~~No `dynamic` export anywhere in app~~ | ~~Low-Medium~~ | **RESOLVED (2026-08-07)** — see correction log below. Applied per-route after categorizing all 60: 59/60 use cookies/auth/searchParams/request-body/service-role (genuinely need it); `/api/ping` returns `Date.now()`, which static optimization would freeze at build time forever, defeating a health check. All 60 verified. |
| ~~Exam marking score clamp~~ | ~~Low~~ | **RESOLVED** — confirmed live in `src/app/api/exam/mark/route.js:185-186`, clamp against hallucinating AI grader is in place. Doc was stale, not the code. |
| Thin test coverage on API routes | Medium | Not addressed this audit |

---

## Backlog: Remaining High-Impact Items

### Critical
*(none currently outstanding — the two critical items found this audit, the unauthenticated admin routes and the missing-RLS table, are both fixed and verified live)*

### High
| Item | Verified outstanding? | Why it matters | Effort | Risk | Ship before next release? |
|---|---|---|---|---|---|
| Cortex Engine failure root cause | Yes — checked Actions API, both required secrets exist by name, code reads them correctly; cause is a stale value or logic bug inside `cortex-engine.js` I can't reach without the actual log text | It's an unattended agent with `contents: write` + `pull-requests: write` running every 6h and silently failing — if it starts working again unexpectedly with a latent bug, it can push directly to `main` | 30min–2hr once log is available | Low to investigate, Medium if it resumes writing while broken | **Yes** — get the log, decide fix-or-disable before relying on it further |
| `export const dynamic` audit across `(app)` routes | Yes — confirmed zero occurrences repo-wide | Auth-gated pages being statically prerendered by default is architecturally wrong even though it isn't currently causing failures; the next contributor who forgets an env var reproduces this session's outage | 2–4hr (needs care: route segment config is Server-Component-only, most `(app)` pages are `"use client"`, so this may require restructuring rather than a one-line add — verify per-page before changing) | Medium — touches rendering behavior across most of the app | Recommended before v1.0, not blocking for incremental releases |

### Medium
| Item | Verified outstanding? | Why it matters | Effort | Risk | Ship before next release? |
|---|---|---|---|---|---|
| API route input-validation sweep | Partial — spot-checked exam/mark, learn, quiz (all solid); not exhaustive across all ~40+ routes | Consistency matters more as the surface grows | 3–5hr | Low | No — do incrementally |
| Test coverage for API routes | Yes — 0 route-level tests exist, only 3 lib-level test files | CI currently can't catch a route-logic regression, only type errors and the 3 existing unit tests | Ongoing | Low to add, but takes real time | No — start incrementally, not a release blocker |
| Consolidate 3 admin-auth patterns into 1 | Yes — `hasUserRole`, `ADMIN_REVIEW_TOKEN`, `ADMIN_SECRET` all coexist | All currently safe, but three patterns = three places to get it wrong next time | 2–3hr | Low-Medium (touches auth, needs care) | No — not urgent, all current instances are safe |
| Architecture documentation | Yes — never written | Nothing else in the backlog explains *how* Cortex/XP/AI chain fit together for a new contributor | 3–4hr | None | No — pure documentation |

### Low
| Item | Verified outstanding? | Why it matters | Effort | Risk | Ship before next release? |
|---|---|---|---|---|---|
| Exam marking score clamp | Yes | Theoretical >100% edge case, never observed | 15min | None | No |
| `feedback/route.ts` dead code removal | Yes — confirmed zero callers | Minor clarity/consistency | 5min | None | No |
| Bundle size / performance pass | Not investigated this audit | Unknown current state | Unknown until investigated | Unknown | No |
| Accessibility tooling + pass | Yes — no `eslint-plugin-jsx-a11y` or similar installed | Unknown current state, no baseline exists | 4-6hr to establish baseline | Low | No |
| Landing page content audit | Not investigated this audit | Unknown current state | Unknown | Unknown | No |

---

## Recommended Release Checklist (before calling this v1.0)
- [x] Resolve or explicitly disable the Cortex Engine until its failure is understood — **resolved 2026-08-07**, PR #77, verified 7 consecutive successful runs
- [ ] Decide on and either fix or formally accept the `dynamic`/static-prerendering pattern
- [ ] Establish an accessibility baseline (even a single pass with axe/lighthouse)
- [ ] Add at least route-level smoke tests for the highest-traffic API routes (exam/mark, learn, tasks)
- [ ] Consolidate admin-auth patterns to one convention
- [ ] Confirm real Supabase migration history matches live DB state end-to-end (this audit checked 6 tables; a full reconciliation wasn't run)

## Recommended Version Number
**Current: `0.2.0`** (bumped this session from `0.1.0`, reflecting the real fixes shipped — not a feature bump, a stability/correctness bump)

## Suggested Milestone
**Next target: `v0.3.0`** — closes the High-priority backlog items (Cortex Engine cause, `dynamic` decision). **`v1.0.0`** should wait until the full Release Checklist above is clear, not before — the app works for current users today, but "1.0" implies a level of operational maturity (monitoring, test coverage, resolved unknowns) that isn't there yet.

---

## 2026-08-07 Verification Pass (Claude)

Cross-checked this report's Outstanding Risks against live repo/Actions/DB state before doing new work, since a stale "ship-blocking" item left standing would misdirect whoever reads this next.

- **Cortex Engine**: this report's own text says "unresolved" in the body, but `DEVLOG.md` already had a 2026-08-05 entry confirming PR #77 fixed it. Verified independently via Actions API rather than trusting either doc: 7 consecutive green runs. Marked resolved above.
- **Exam marking clamp**: code already has the fix; this report's "not fixed" was stale at time of reading, not wrong at time of writing (can't confirm which commit added it without full blame history).
- **`dynamic` export gap**: re-verified, still accurate. Left open deliberately, not fixed reflexively — blanket-adding `force-dynamic` across 60 routes without checking which are safe to statically prerender risks trading one class of fragility for a caching regression. Needs a deliberate per-route pass, not a sweep.

## 2026-08-07, later same day — `dynamic` export gap closed

Did the deliberate per-route pass instead of leaving it open indefinitely. Categorized all 60 routes by actual per-request signals (cookies/auth client, `searchParams`, `await request.json()`, service-role key usage) rather than assuming — 59/60 had clear signals, all genuinely need `force-dynamic`. The 1 without a signal, `/api/ping`, returns `Date.now()` in the response body — if ever statically optimized, the "live" health check would freeze at build time and serve the same stale timestamp forever, which is arguably worse than the other 59's caching risk. Applied to all 60.

Script-applied insertion (positioned after the last top-level `import` line) broke one file, `src/app/api/cortex/route.ts` — it has a multi-line `import { ... } from ...` block with nothing after it, and the script's line-based detection landed inside the block instead of after it. Caught immediately by `tsc --noEmit` (6 syntax errors, exact line), fixed by hand, re-verified clean. A second file, `src/app/api/learn/route.ts`, has the identical multi-line-import shape but happened not to break, purely because it has more single-line imports after that block — the script's "last import line" landed past the multi-line block by coincidence, not because the detection was actually correct there. Confirmed via full untruncated `tsc --noEmit` output (only the one file errored) and independently `node --check`'d all 7 `.js` route files (not fully covered by the TS compiler graph) before shipping.
- Also found and fixed, separately: the achievements/badges duplication bug (same class as the Daily Challenge one from PRs #77-80) — see `DEVLOG.md` 2026-08-07 entry and commit `79f92a4`. Not something this report's audit scope would have caught, since it required diffing `.cortex/tasks.md` against actual wired-up pages rather than reviewing code in isolation.
