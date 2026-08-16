# Offline Sync Security Boundary

Queued mutations are scoped to the authenticated account that created them.

## Rules

1. A mutation cannot be queued without an authenticated user.
2. The queue stores `ownerId` and can only list mutations for that owner.
3. Replay requires a current authenticated user.
4. A queued `payload.user_id`, when present, must match the current user.
5. Task and subject writes force `user_id` to the current authenticated user.
6. Update/delete operations include the current user in their row predicate.
7. RLS remains the authoritative server-side authorization boundary.
8. Ownerless legacy queue records are not replayable through the owner-scoped API.

This protects against a common account-switch failure mode where a browser retains an offline mutation created by one account and later replays it while another account is active.

## Remaining security work

- verify production RLS policies for every supported mutation
- add server-side idempotency keys
- define conflict policies per operation
- test logout/login and account-switch scenarios in a real browser
- add safe queue cleanup for explicitly signed-out accounts where appropriate
