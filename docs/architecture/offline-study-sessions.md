# Offline Study Sessions

StudySpace uses one IndexedDB database for work and resumable session state. Lessons, practice, assessments, exams, Workmate tasks, and Canvas work can share a WorkObject; timed or interruptible flows additionally persist `StudySessionState` keyed by `workId`.

## Lifecycle

`active -> paused -> active -> submitted -> synced`

A submitted session is not resumed. Synchronization is responsible for moving submitted local work to `synced` after the server accepts it.

## Offline rules

- Persist work and session state locally before relying on a network response.
- Never cache mutation responses in the service worker.
- Resume from the latest local state when the network is unavailable.
- Preserve the same `workId` so evidence remains idempotent.
- Treat server sync as reconciliation, not the source of truth for an in-progress session.
