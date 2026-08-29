# Offline sync contract

## Source of truth

While offline, the device-local state is authoritative for the learner's active session. UI and core features must read/write local state without waiting for a network response.

## Mutation queue

Every local create/update/delete that needs cloud persistence should produce a durable mutation record with a stable ID, entity, operation, payload and creation timestamp.

## Reconnection

When connectivity returns:

1. preserve local UI availability;
2. process queued mutations idempotently;
3. use stable mutation/entity IDs to prevent duplicates;
4. resolve conflicts using entity-specific rules rather than a blanket last-write-wins policy;
5. mark successful mutations as synchronized;
6. retry transient failures without losing the local record.

## Privacy

Private project evidence remains local unless cloud upload is explicitly permitted by the applicable product/privacy policy. Model availability must never be the sole reason to upload it.

## Account linking

A local learner can exist before authentication. Linking an account later must merge or associate local work without destructive replacement.
