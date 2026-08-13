# Shadecode Student Local-First Architecture

## Decision

Shadecode Student is moving from **server-first** to **local-first**.

The user's device is the primary data plane. Supabase becomes an optional coordination, backup, and recovery layer rather than the place every click has to travel through.

### Target hierarchy

```text
                    ┌───────────────────────────┐
                    │      Optional cloud       │
                    │ encrypted backup / relay  │
                    └─────────────▲─────────────┘
                                  │
                           sync when available
                                  │
┌─────────────────────┐     ┌─────┴──────────────┐     ┌─────────────────────┐
│      Phone A        │◄───►│  Local-first core  │◄───►│      Laptop B       │
│ IndexedDB + Cortex  │     │ merge + op log     │     │ IndexedDB + Cortex  │
└─────────────────────┘     └────────────────────┘     └─────────────────────┘
```

## What changes

### 1. Local state is authoritative

Tasks, progress, study state, XP-related state, goals, streak state, settings, and other suitable user-owned state should be written locally first.

The UI must not wait for a network round trip to confirm ordinary actions.

### 2. Operations are recorded locally

Each mutation receives:

- a device ID
- a Lamport-style version
- a timestamp
- an operation ID
- the entity and payload

This gives Shadecode a deterministic basis for merging changes from multiple devices without requiring a central database to arbitrate every click.

### 3. Cloud backup is encrypted before upload

The `src/lib/local-first/crypto.ts` module encrypts sync bundles in the browser with AES-GCM and derives the key from a user-held passphrase using PBKDF2-SHA-256.

The cloud adapter therefore sees ciphertext, not the student's study state.

### 4. File-based recovery is a first-class path

A `.scsync` bundle can be exported and imported without the cloud. This is useful for:

- moving to a new phone
- restoring after browser storage is cleared
- transferring data between devices
- keeping a personal offline backup

## Why this is cheaper

The normal learning loop no longer needs a database read/write for every interaction. The device absorbs most reads and writes locally.

Supabase usage becomes concentrated around:

- authentication
- occasional backup/restore
- optional cross-device relay
- genuinely shared features such as leaderboards
- server-side AI/provider calls where required

This is a much better cost shape for a student product.

## Cross-device roadmap

### Phase A: implemented

- IndexedDB local-first store
- device identity
- append-only local operation records
- deterministic record merge
- encrypted `.scsync` export/import
- encrypted optional Supabase Storage backup
- dedicated `/sync` control surface

### Phase B: next

Build automatic cloud sync as an **opaque encrypted relay**:

1. Device creates encrypted operation batches.
2. Supabase Storage holds only encrypted batches.
3. Other devices pull batches and merge them locally.
4. Devices remain useful if the cloud disappears.

### Phase C: breakthrough path

Add direct peer-to-peer device sync with WebRTC.

The cloud would only provide short-lived signaling/rendezvous information. Actual study data would move directly between devices and remain encrypted end-to-end.

Potential pairing mechanisms:

- QR pairing code
- six-word pairing code
- local-network discovery where supported
- WebRTC data channel for direct transfer

This makes the cloud closer to a phone directory than a database.

## Conflict strategy

Shadecode should prefer deterministic, explainable merges over silent last-write-wins wherever possible.

For scalar state, use version ordering with device ID as a deterministic tie-breaker. For richer data, evolve toward operation-specific merge rules or CRDT-style structures.

Examples:

- task completion: completion event wins over stale task state
- XP: derive from immutable events rather than blindly copying a total
- streaks: derive from dated study activity
- notes: preserve both edits or use per-block merge
- achievements: union earned achievement IDs
- settings: newest version wins

## Important boundary

Not everything should become decentralized.

Server-authoritative or server-assisted features remain appropriate for:

- authentication
- public leaderboards
- school communication
- abuse prevention
- shared classroom data
- paid entitlements
- provider API keys and privileged AI calls

The principle is **local-first, not server-never**.

## Existing offline layer

Shadecode already has an IndexedDB offline subsystem under `src/lib/offline/` for lessons, notes, quizzes, progress, and tasks. The new `src/lib/local-first/` layer is the architectural foundation for the broader application state and cross-device merge model.

The migration should be incremental. Existing offline behavior should continue working while features are moved to the local-first store one domain at a time.
