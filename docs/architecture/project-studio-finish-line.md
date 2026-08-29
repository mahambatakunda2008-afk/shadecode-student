# Project Studio finish line

Project Studio is complete only when the following are true:

- Projects open and save locally without network access.
- Evidence is persisted locally.
- Stage progress survives reload/offline restart.
- Recovery snapshots exist for important saves and before deletion.
- A student can inspect and restore a previous snapshot without network access.
- Restore creates a recoverable new state rather than destroying the current state.
- Local mutations are durably queued for cloud synchronization.
- Reconnect processing is idempotent and does not duplicate or lose projects.
- Cloud synchronization is optional for core offline use.
- Project integrity checks prevent unsupported invented evidence from being presented as fact.
- Cortex remains an assistant/coach and cannot silently replace the student's actual project evidence.
- Board/level templates remain separate from the core project data model.
- The UI exposes offline/sync/recovery state clearly enough that students understand where their work lives.

## Verified foundation

The current Project Studio workspace already has local-first project persistence, evidence capture, stage progression, integrity checks, learner-owned document outlining, recovery checkpoints and a shared offline mutation queue. Project records and evidence are also represented in the live Supabase schema. The recovery layer now explicitly handles aborted IndexedDB transactions during snapshot pruning instead of treating an abort as a successful cleanup operation.

## Remaining completion boundary

The feature should not be called fully complete until the browser path is verified offline, a reconnect cycle is tested against the authenticated backend, duplicate/replay behavior is demonstrated, and the UI exposes the resulting sync state clearly. Those are verification/integration gates rather than permission to create another project data model.

## Recovery policy

Keep a rolling history of recent project snapshots locally. Snapshot before destructive actions and before restoring an older version. Limit storage per project to avoid unbounded growth.
