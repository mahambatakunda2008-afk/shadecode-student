# Offline account hardening

Date: 2026-08-23

## Fixed

Offline lesson progress is now stored in an account-scoped IndexedDB store using a deterministic `userId:lessonId` key. The database version is upgraded from v3 to v4 and surviving legacy progress rows are copied when both `userId` and `lessonId` are present.

Progress reads, writes, and sync acknowledgements require the authenticated account. Offline sync filters pending progress, tasks, and subjects to the active account before writing to Supabase. IndexedDB connections close on `versionchange` so upgrades do not leave stale connections blocking migration.

## Safety boundary

IndexedDB remains a cache, not an authorization boundary. Server-side authentication and RLS remain authoritative. Unauthenticated progress access returns no local record, and sync refuses records owned by another authenticated account.

## Remaining work

StudySpace WorkObjects still need the same account-scoped persistence treatment before local StudySpace data should be considered a complete multi-account boundary. Exam recovery, conflict UI, and durable event reconciliation remain separate follow-up work.
