# Cortex Active Execution Queue

This is the executable queue for Cortex Engineering. `.cortex/tasks.md` remains the historical/strategic roadmap and audit trail.

## 🔴 Security audit completion
- Finish auth/API/file-upload/service-role/AI-boundary review.
- [x] 2026-09-19: audit follow-ups closed (timing-safe secret compare, legacy `/api/feedback` fail-closed, admin upload size cap) — see `docs/audits/2026-08-24-security-audit.md` §6. Still open: unauthenticated `/api/cortex/event|state` stubs and unused RLS-locked tables (product calls).
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
- Never invent syllabus content.

## 🟡 Tertiary learning workflows
- Extend the existing tertiary foundation into courses/modules, assessments, workload/deadlines, credits/GPA and higher-ed exam workflows.
- Reuse `academic_contexts`, existing learning evidence and `topic_mastery`.
