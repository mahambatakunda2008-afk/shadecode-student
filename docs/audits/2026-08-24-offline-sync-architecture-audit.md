# Offline Sync Architecture Audit

**Date:** 2026-08-24
**Author:** Claude (Chief Software Engineer)
**Scope:** `.cortex/tasks.md` immediate-queue item — "Inventory current offline/PWA
behavior, caching, persistence and mutation paths. Produce a sync contract before
implementing P2P or deeper offline functionality."
**Method:** Full read of every file under `src/lib/offline/`, `src/lib/local-first/`,
`public/sw.js`, `public/manifest.json`, plus a repo-wide grep for every call site of
each mechanism, to distinguish live code paths from dead ones rather than inferring
from file structure alone.

---

## 1. Executive summary

The offline system works and is more careful than a typical student-app PWA layer —
real IndexedDB persistence, exponential backoff, owner-scoping on every read/write, an
allowlist of which stores may even be queued. That's the good news.

The bad news, and the reason this audit exists: **there are four independent, mostly
uncoordinated storage/sync subsystems**, three of which overlap in what they claim to
do for the same data (tasks, subjects, lesson progress). None of this is currently
causing a known production bug, but it is exactly the kind of latent complexity that
turns into a hard-to-reproduce data-loss report once P2P or genuinely offline-first
multi-device sync gets built on top of it, per the task's own framing. This audit's
job is to make that structure explicit before that happens, not to fix all of it today.

**One dead-code deletion was made as part of this audit** (zero risk, zero callers,
confirmed by repo-wide grep). Everything else below is findings + a recommended
contract, not code changes — audits diagnose, they don't rewrite, per this project's
own engineering rules.

---

## 2. Full inventory

| # | System | Storage | Scope | Status |
|---|--------|---------|-------|--------|
| 1 | Service worker (`public/sw.js`) | Cache API, `shadecode-assets-v3` | Static assets only (`.js/.css/.svg/.png/...`); explicitly never intercepts navigation, `/api/*`, or RSC requests | **Live**, correctly conservative |
| 2 | `mutationQueue.ts` | IndexedDB `shadecode-offline-mutations` | Generic write queue for an allowlisted set of Supabase tables (`tasks`, `subjects`, `learn_lessons`) | **Live** — the only write path used by the real `/tasks` UI |
| 3 | `storage.ts` (`offlineStorage`) + `sync.ts` (`offlineSync`) | IndexedDB `shadecode-offline` | Read-through cache for lessons/notes/quizzes, plus a *second*, independent "unsynced flag" write-tracking mechanism for tasks/subjects/progress | **Partially live** — see §3.1 and §3.2 |
| 4 | `downloadManager.ts` | Same IndexedDB `shadecode-offline` DB, `progressByUser`/`lessons`/`notes`/`quizzes` stores | Downloaded-lesson content + offline quiz-completion progress | **Live** — real feature (offline lesson downloads, `LessonEvidenceRecorder`) |
| 5 | `local-first/*` (7 files, 620 lines: `store.ts`, `operation-store.ts`, `crypto.ts`, `backup.ts`, `device.ts`, `tasks.ts`, `subjects.ts`) | IndexedDB (separate op-log with device IDs + sequence numbers) + encrypted cloud backup bundles | Encrypted, device-scoped backup/restore with an append-only operation log — a materially more sophisticated CRDT-adjacent design than any of the above | **Built but unreachable** — see §3.3 |
| 6 | `cortex-queue.ts` | IndexedDB `cortex_verify_db` (separate database) | Cortex Verify (math checker) attempt queue, account-scoped, with an explicitly quarantined legacy v1 store | **Live**, well-isolated, no overlap with the above |
| 7 | `dashboardCache.ts` | (read-through cache, not a write queue) | Dashboard read-through offline caching, shipped this cycle per `DEVLOG.md` | **Live**, read-only, no conflict potential |
| 8 | Legacy `queueOfflineWrite`/`getOfflineQueue`/`clearOfflineQueue` (`index.ts`) | `localStorage` key `shadecode_offline_queue` | Generic write queue — an early, simpler predecessor to `mutationQueue.ts` | **Dead.** Zero callers anywhere in the app (confirmed by grep). **Removed in this audit.** |

Four separate IndexedDB databases exist in total: `shadecode-offline`,
`shadecode-offline-mutations`, `cortex_verify_db`, and whatever `local-first/db.ts`
opens. Each is individually scoped and reasonably named, so this isn't a bug by
itself — but it means "clear my offline data" or "how much storage does the app use"
has no single answer anywhere in the code today.

---

## 3. Findings

### 3.1 Two independent implementations of progress sync, both live, both running

- `LessonEvidenceRecorder.tsx` calls `downloadManager.saveOfflineProgress()` on quiz
  completion, which writes `synced: false` into the shared `progressByUser` store.
- That row can then be drained by **either**:
  - `downloadManager.syncProgress(userId)` — called directly from
    `/learn/[lessonId]/page.tsx`, or
  - `OfflineSync.syncProgress()` (a *different* method, in `sync.ts`) — called as part
    of `syncAll()`, which runs on a 30-second interval and on every `online` event,
    globally, for every signed-in user, via `UserContext.tsx`.

Both implementations read the same `getUnsyncedProgress()` rows, both write to the
same `learn_lessons` table, and both call `markProgressSynced()` on success. They are
not calling each other — they are two hand-written copies of the same logic that
happen to agree today. This is not currently a correctness bug (the Supabase writes
are idempotent upserts/updates keyed by `lessonId` + `user_id`), but it is:

- **Redundant network traffic** — a user coming back online can trigger both paths
  within the same few seconds, double-submitting the same update.
- **A maintenance trap** — a future fix to one (e.g. adding retry/backoff, per
  `mutationQueue`'s pattern) silently doesn't apply to the other.
- **The most likely site of a real bug** once retry/backoff or conflict resolution is
  added, since two independent call sites racing against the same rows is exactly the
  shape that produces intermittent, hard-to-reproduce failures.

**Recommendation:** collapse to one implementation. `sync.ts`'s version is the one
already wired into the app-wide auto-sync loop; `downloadManager.syncProgress` should
either delegate to it or be removed in favor of it, once `/learn/[lessonId]/page.tsx`'s
explicit call is confirmed safe to drop. Not done in this pass — this is a behavioral
change to a live student-facing flow (quiz completion) and deserves its own scoped,
tested change, not a same-day audit edit.

### 3.2 `tasks`/`subjects` are tracked by *two* unrelated mechanisms that don't talk to each other

`mutationQueue.ts`'s `USER_SCOPED_MUTATION_STORES` allowlist includes `"tasks"` and
`"subjects"` — and the real `/tasks` page uses exactly that path via
`offlineSync.queueMutation()`. Separately, `storage.ts` has a parallel
`synced: false` / `getUnsyncedTasks()` / `getUnsyncedSubjects()` mechanism for the
same two entities, drained by `sync.ts`'s `syncTasks()`/`syncSubjects()` inside the
same `syncAll()` call.

Unlike §3.1, this second path currently has **no live writer** from the main app —
the only code that ever writes a task/subject with `synced: false` is
`local-first/tasks.ts` / `subjects.ts` (see §3.3), which is unreachable from normal
navigation. So today this is inert, not actively racing. But it means `syncAll()`
does real, scheduled work (`syncTasks()`, `syncSubjects()`) on every sync tick for
every user, for a code path that can never currently have data in it — dead weight
on the 30-second interval, and a second contract for "how does a task get from local
storage to Supabase" that a future engineer (or agent) could reasonably assume is the
live one, since it's structurally identical to the progress-sync pattern that *is*
live.

**Recommendation:** decide, don't merge silently. Either (a) retire
`syncTasks`/`syncSubjects` and the `synced` flag on the `tasks`/`subjects` IndexedDB
stores entirely, since `mutationQueue` is the actual contract for those two entities,
or (b) if `local-first/*` is meant to become the real task/subject sync path (see
3.3), make that migration explicit and remove `mutationQueue`'s handling of
`tasks`/`subjects` instead. Doing both indefinitely guarantees eventual drift.

### 3.3 A complete, unlinked encrypted local-first sync system exists at `/sync`

`src/lib/local-first/` is not a stub — it's a real, materially more advanced design
than anything else in the offline layer: a device-scoped, sequence-numbered
append-only operation log (`operation-store.ts`), client-side encryption
(`crypto.ts`), and encrypted cross-device backup/restore (`backup.ts`, uploading and
downloading encrypted bundles). It powers exactly one page, `src/app/sync/page.tsx`
("Your device is the primary copy of your study data" / passphrase-protected
encrypted backup and restore).

**That page has zero links from anywhere in the app's navigation.** No sidebar entry,
no settings link, nothing — confirmed by grep across every component. A real,
substantial, security-conscious feature (620 lines, its own test suite in
`local-first/__tests__/operations.test.ts`) is currently unreachable by any real
student.

This is very plausibly the actual intended foundation for "P2P or deeper offline
functionality" that this task's own framing references — which makes it more
important, not less, to resolve deliberately rather than let two sync paradigms
(the simple `mutationQueue` retry-queue, and this operation-log/CRDT-adjacent design)
coexist by accident.

**Recommendation, not a decision:** this needs a product call, not just an
engineering one — is `/sync` a real, near-term feature that should be linked into
settings/navigation now, or exploratory work that should be flagged as such (e.g. a
comment at the top of `local-first/index.ts` noting it's not yet wired into product
navigation) so nobody mistakes "code exists" for "feature is live"? Recommend
surfacing this to product planning rather than Claude deciding unilaterally, since it
changes what students can do, not just how code is organized.

### 3.4 Dead code — removed in this audit

`queueOfflineWrite()`, `getOfflineQueue()`, `clearOfflineQueue()` in
`src/lib/offline/index.ts` — a `localStorage`-based write queue with zero callers
anywhere in the codebase (confirmed by repo-wide grep before removal). This predates
`mutationQueue.ts` and was fully superseded by it. Deleted as part of this audit:
zero behavior change, zero risk, reduces the inventory from five candidate
"which queue does this go through" answers to four.

### 3.5 Service worker: no findings

`public/sw.js` is deliberately narrow — cache-only for static assets, explicit
early-return on navigation/`/api/`/RSC requests — which is the right call for an app
where Next.js owns routing/auth state and load-shedding means the network can vanish
mid-session. No changes recommended here.

---

## 4. Risk register (for the Zimbabwe load-shedding context specifically)

| Risk | Current mitigation | Gap |
|---|---|---|
| Network drops mid-write | `mutationQueue` retries with exponential backoff (5s → 15min cap, 8 attempts) | None — this is solid |
| Two devices edit the same task while both offline | Not handled by `mutationQueue` (last-write-wins via `upsert`); `local-first`'s operation log is designed for this but isn't wired to `tasks`/`subjects` in practice (§3.2) | Real gap once multi-device use is common |
| User never comes back online before `MAX_ATTEMPTS` (8) | Mutation marked failed, surfaced via `mutationQueue.listFailed()` / `getStatus()` in `OfflineShell.tsx` | Needs confirming this is actually visible/actionable in the UI, not just tracked internally — out of scope for this audit, worth a follow-up UX check |
| Duplicate progress writes on reconnect (§3.1) | Idempotent upserts mask it today | Will stop being harmless once retry/backoff or conflict resolution is added to either path independently |
| Storage quota exhaustion (offline lesson downloads) | `getStorageSize()` exists in both `storage.ts` and `downloadManager.ts` | Not investigated in this pass — flag for the next audit cycle if download volume grows |

---

## 5. Recommended sync contract going forward

Before any P2P or deeper offline work is built on top of this, the following should
be true and written down somewhere durable (this doc, or promoted into
`AGENT_COORDINATION_PROTOCOL.md` if it should bind all agents):

1. **One write-queue mechanism per entity.** `tasks`, `subjects`, and
   `learn_lessons`/progress should each have exactly one documented path from "user
   makes a change offline" to "change is durable in Supabase." Today progress has two
   (§3.1); tasks/subjects nominally have two but only one is live (§3.2).
2. **`local-first/*`'s fate gets decided, not left ambiguous.** Either it's the future
   of multi-device sync (in which case `mutationQueue` should be understood as the
   interim/simple-case implementation it will eventually be replaced by) or it's
   parked (in which case say so in the code, and don't let it silently keep running
   against real user data via the unlinked `/sync` page).
3. **New offline-capable features declare which queue they use, explicitly, in their
   PR/commit description** — not "add offline support" without naming
   `mutationQueue` vs. the `storage.ts` synced-flag pattern vs. `local-first`. This
   audit exists because that wasn't consistently done historically; cheap to fix
   going forward.
4. **`USER_SCOPED_MUTATION_STORES`'s allowlist is the closest thing this codebase has
   to a canonical "which tables support offline writes" list.** Treat it as such —
   if `local-first` or any future mechanism adds table-level offline writes, it
   should be reconciled against this list, not maintained as a silent parallel one.

This audit does not resolve items 1–3 above — those are architecture decisions with
real product trade-offs (do we want CRDT-grade multi-device sync, or is
last-write-wins genuinely fine for a single-device-per-student product?) that belong
with you, not something to decide unilaterally while auditing. Flagging as ready for
that decision.
