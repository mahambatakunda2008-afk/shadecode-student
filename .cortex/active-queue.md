# Cortex Active Execution Queue

This is the executable queue for Cortex Engineering. `.cortex/tasks.md` remains the historical/strategic roadmap and audit trail.

## 🔴 Security audit completion
- Finish auth/API/file-upload/service-role/AI-boundary review.
- [x] 2026-09-19: audit follow-ups closed (timing-safe secret compare, legacy `/api/feedback` fail-closed, admin upload size cap) — see `docs/audits/2026-08-24-security-audit.md` §6. Legacy `/api/feedback` and the unauthenticated `/api/cortex/event|state` stubs were then retired (zero callers). Still open: unused RLS-locked tables (`exam_logs`, `insights_archive`) and the Supabase leaked-password-protection toggle.
- [x] 2026-09-20: leaderboard integrity hole on `profiles` closed (trigger pins xp/level/streak/season/rank columns for browser roles; `increment_xp` service-role only). See audit §7.
- Reconcile live Supabase security findings with repository migrations.
- Add regression coverage for authorization boundaries.

## 🔴 Assessment intelligence adapter
- Audit current Exam Hub, past-paper, syllabus and exam-result producers.
- Map existing marked-exam evidence into the canonical assessment evidence model.
- Preserve stable assessment/attempt identifiers.

## 🔴 Offline sync completion
- [~] Offline navigation integration: service-worker RSC caching, network-only public landing page, authenticated `/` → `/dashboard`, and offline-safe `(app)` auth gate are now shipped.
- [x] Server-side idempotency for queued mutations: already shipped (verified 2026-09-19). `POST /api/sync` -> `apply_sync_mutation` RPC (`supabase/migrations/20260901231500_harden_sync_mutation_record_ownership.sql`) returns `accepted` / `already-applied` (same device, `client_version <=` current) / `conflict` (base version mismatch). Now covered by `src/tests/server/api/sync.test.ts` (auth, store allowlist, owner spoofing, result semantics).
- [x] Duplicate progress sync path (audit §3.1) collapsed: `downloadManager.syncProgress` posted to a non-existent `/api/learn/progress` (404), ignored the HTTP status, then acknowledged local ops as synced (silent offline-progress loss). It now delegates to `offlineSync.syncAll()`; regression test in `src/lib/offline/__tests__/downloadManager.syncProgress.test.ts`.
- [x] Retry/backoff: exponential 5s -> 15min cap, 8 attempts (`mutationQueue.ts`); failed count surfaced in `OfflineShell` with a manual retry.
- Still open: operation-specific conflict policies. Today there is one rule (optimistic concurrency, server wins, client reconciles via `reconcileConflict`); e.g. delete-vs-update has no dedicated policy.
- [x] Permanent-failure detail (2026-09-19): `OfflineShell`'s "need attention" pill now expands to show which kinds of change failed and a friendly reason (`src/lib/offline/failureSummary.ts`). Raw `lastError` text is only used to classify, never displayed. There is deliberately no "discard" action yet: dropping a student's unsynced work is a product call.
- [x] `/api/sync` no longer returns raw database errors (generic `Sync failed`, detail logged server-side); a cross-account write returns a truthful 403.
- Still open: verify account switching and logout/login behavior in a real browser.

## 🔴 Product observability completion
- Close gaps in activation, retention, error, latency, sync-failure and AI-cost telemetry.
- Verify admin/traction dashboards against real producers.

## 🟡 Curriculum coverage expansion
- Populate real topic catalogs for supported Cambridge/ZIMSEC subjects before adaptive scheduling depends on them.
- Verified 2026-09-20 with direct queries: the objective-level curriculum (`curriculum_versions` + `curriculum_objectives`) covers **Computer Science only**: ZIMSEC 4021 (141, draft), Cambridge 0478 (68, verified), 9618 (20, draft), 0984 (10, draft), 2210 (10, draft) = 249 objectives. Every other subject has none. The pipeline is `npm run ingest:curriculum`; each new subject needs its official source PDF and the existing verification protocol.
- [x] 2026-09-20: Cambridge AS & A Level Mathematics 9709 (2026-2027, version 4) loaded: 159 verified objectives (6 sections / 38 topics / 153 outcomes) + 13/29 coverage dimensions with page evidence. Not yet resolvable: 16 dimensions (4 need past papers / mark schemes / examiner reports / grade thresholds: owner policy call) and the knowledge layer (15 kinds) remain, and no learner has a stored identity. See `docs/curriculum/cambridge-mathematics-9709.md` and `docs/curriculum/identity-gap.md`.
- [x] 2026-09-20: Cambridge AS & A Level Physics 9702 (2025-2027, version 1) loaded: 325 verified objectives (25 topics / 76 subsections / 300 outcomes, official numbering) + 14/29 coverage dimensions incl. practical_requirements. See `docs/curriculum/cambridge-physics-9702.md`.
- Correction (verified against live data 2026-09-20): **Computer Science 0478 fully satisfies the strict resolver gate** (29/29 coverage, 75 verified knowledge items across all 15 kinds); earlier notes saying no subject resolves were wrong. It matches no current learner (they declared A Level and ZIMSEC syllabi), so the biggest lever is completing the packages learners actually chose: 9709 and 9702 need ~15 coverage dimensions and a knowledge layer (use the 0478 package as the template), and CS 9618 / ZIMSEC 4021 are at 2/29.
- Decision recorded: `docs/curriculum/coverage-evidence-policy.md` (specimen material is `draft` evidence only; recommends splitting the exam-history dimensions out of the syllabus-grounding gate, not implemented).
- Next by demand: Chemistry 9701 and Biology 9700 (A Level), then ZIMSEC Mathematics (site blocks automated fetching; needs another route).
- Never invent syllabus content.

## 🟡 Tertiary learning workflows
- Extend the existing tertiary foundation into courses/modules, assessments, workload/deadlines, credits/GPA and higher-ed exam workflows.
- Reuse `academic_contexts`, existing learning evidence and `topic_mastery`.
