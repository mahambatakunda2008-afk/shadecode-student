# Android Offline Data Protection — Implementation Log

**Date:** 2026-11-12  
**Repository:** `mahambatakunda2008-afk/shadecode-student`  
**Approach:** Direct commits to the default branch; no PR opened.

## Changes implemented

### 1. Sign-out no longer wipes the NativeStore

File: `android/app/src/main/java/com/shadecode/student/NativeStore.kt`

Previously, `clearSession()` called `DataStore.edit { it.clear() }`, deleting every preference in the `shadecode_native` store, including account-scoped task caches, timetable caches, and pending offline operations.

It now removes only:
- access token
- refresh token
- active user ID
- active email

Account-scoped task/timetable caches and pending operations are retained. Destructive local-data deletion must be a separate, explicit account-removal action.

### 2. Cached profiles are now account-scoped

The previous profile cache used one global `cached_profile` key. That could return the previous learner's profile after another learner signed in on the same installation.

Changes:
- New profile writes use `cached_profile_<profile.id>`.
- Profile reads require the active account ID.
- The legacy `cached_profile` entry is migrated only when its embedded `id` exactly matches the requested account.
- A legacy profile for another account is never returned.

File: `android/app/src/main/java/com/shadecode/student/MainActivity.kt`

The profile-loading path now calls `readProfile(session.userId)`.

## Commits

- `08af928fa75afdbe8cc23d0bba471046253b28de` — preserve offline data on sign-out and scope profile cache writes.
- `b7c2e1f892d932516c4cd9c003f3683a220596b5` — read cached profile using the active account ID.

## Verification and limitations

- Re-fetched both changed files from the repository after the commits.
- Confirmed the sign-out implementation removes only the four credential/active-session keys.
- Confirmed the profile reader requires an account ID and the app passes `session.userId`.
- GitHub commit status currently reports a Vercel failure due to a build-rate-limit/plan response. This is not an Android compilation result.
- No Android Gradle build or physical-device test has been run in this execution. Do not treat this change as release-verified.

## Remaining risks before this workstream is complete

1. `pending_sync` Room rows are not yet account-scoped. Lesson-progress operations need ownership metadata and safe migration before multi-account sync can be considered isolated.
2. The Room queue and DataStore queue remain separate. Consolidation requires a migration that preserves all pending operations.
3. The sync worker must be tested for account switching, duplicate delivery, server-commit/response-loss, expired-token refresh, and force-close.
4. Account deletion needs a deliberate UI and policy; it must not be conflated with ordinary sign-out.
5. Session credentials still need a dedicated security review and Android Keystore-backed protection.

## Next implementation slice

Add account ownership and operation identifiers to the Room-backed lesson-progress queue, with a versioned Room migration and tests. Do not delete or replay legacy queued rows under an arbitrary account. Preserve legacy rows until their owner can be established safely.
