# Android account-deletion completion flow

Updated: 5 November 2026

## Request and lock

- Profile submits `POST /api/account/deletion-request` using the current native access token.
- On a successful accepted response, the client persists the opaque request ID and a deletion-pending lock in DataStore.
- The native sync worker checks that lock before refreshing credentials or replaying any queued operation. A pending request therefore cannot replay offline writes.

## Completion polling

- While the account is pending deletion, Profile polls `GET /api/account/deletion-status?requestId=<uuid>` every 30 seconds.
- The endpoint is intentionally a narrow capability: it returns only status, completion timestamp, and a boolean. It does not return email, user ID, or account records.
- Pending, processing, failed, and temporary network-error states keep the device locked. A failed request is surfaced for manual support review; it does not clear local data.
- Only an explicit server response with `completed: true` begins local cleanup.

## Local cleanup after server confirmation

- Clear Room pending sync operations.
- Clear learner progress records and reset progress values embedded in cached lesson rows.
- Clear account subject selections.
- Preserve cached lesson content because it is shared offline curriculum, not account-owned material.
- Clear the target account's DataStore session, profile, task snapshot, timetable snapshot, and native pending-operation snapshot.
- Sign out after cleanup.

## Known local ownership limitation

Snap & Extract artifacts currently live in a device-local directory without an account ID in their file schema. The deletion flow deliberately does not erase those files because it cannot prove which account owns them on a multi-account device. Before treating local deletion as fully complete, introduce account ownership metadata and a safe migration for existing artifacts, or provide an explicit device-level local-data removal step with clear scope.

The Room database also uses a single active learner context rather than account-keyed rows. The current cleanup matches the app's single-active-account model. If multi-account offline profiles are introduced, Room rows must gain owner IDs before this cleanup can be reused unchanged.

## Activation boundary

This client flow does not activate the server worker. Supabase migrations, disposable-account integration tests, provider retention/deletion review, and explicit production authorization remain prerequisites. No production account is deleted by this client change alone.
