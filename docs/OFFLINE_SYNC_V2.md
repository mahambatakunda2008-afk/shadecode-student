# Offline Sync V2

## Goal

Make offline work a first-class application capability rather than a collection of feature-specific caches.

## Current state

Shadecode already has offline storage/synchronisation for selected application data. The next layer is a generic mutation queue that records user intent while offline and can replay it when connectivity returns.

## Mutation contract

Each queued mutation has:

- stable client-generated `id`
- semantic `operation` name
- serializable `payload`
- `createdAt`
- retry `attempts`
- `status`: `pending`, `syncing`, or `failed`
- optional `lastError`

The mutation ID is the idempotency key. A server adapter must treat a repeated mutation ID as the same operation rather than creating duplicate effects.

## Sync lifecycle

```text
UI action
   ↓
enqueue mutation
   ↓
local state updates optimistically
   ↓
connectivity returns
   ↓
pick pending mutation
   ↓
mark syncing + increment attempt
   ↓
server idempotency check
   ├── success → remove from queue
   └── failure → mark failed
                    ↓
                 retry later
```

## Design rules

1. Offline state must never silently discard a user action.
2. Queue records intent, not an HTTP request, so it remains independent of transport.
3. Mutations must be replayable and idempotent.
4. Failed mutations remain inspectable instead of disappearing.
5. Sync must be safe to run more than once.
6. Server truth wins when an operation conflicts with a newer authoritative update, subject to operation-specific conflict rules.
7. Authentication changes must invalidate or re-authorize queued mutations before replay.
8. Sensitive data should not be stored in an unencrypted client queue unless explicitly required.

## Next implementation stages

### Stage 1: client queue

Implemented in `src/lib/offline/mutationQueue.ts`.

### Stage 2: sync coordinator

Add an adapter that drains pending mutations when online, applies exponential backoff, and prevents concurrent drains.

### Stage 3: server idempotency

Add request-level idempotency handling to mutation endpoints. Do not create a generic database table until the existing Supabase schema and deployment constraints have been audited.

### Stage 4: conflict policy

Classify operations as:

- append-only
- last-write-wins
- mergeable
- server-authoritative

Each operation gets an explicit policy rather than a universal conflict algorithm.

### Stage 5: observability

Track queue depth, failed mutations, retry count, sync latency and permanent failures without recording sensitive payloads.

## What this does not do yet

This layer does **not** claim that every existing feature is offline-safe. Existing feature-specific sync remains in place until it is migrated to the generic contract and verified. No destructive migration should happen as part of this work.
