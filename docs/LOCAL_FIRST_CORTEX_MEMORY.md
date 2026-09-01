# Cortex Device-First Memory Contract

Cortex has two memory classes:

1. **Interaction cache**: short-lived question/answer similarity cache.
2. **Persistent learner memory**: durable learning patterns used for personalization.

The persistent learner-memory contract is:

- Read the device snapshot first when available.
- A missing network must not prevent Cortex from reading the last known learner state.
- Writes must persist locally before any remote attempt.
- Local records are account-scoped and must never hydrate across users.
- Server hydration must carry ordering metadata and must not overwrite newer local state.
- Clearing a user's local Cortex memory must be explicit and account-scoped.
- Server idempotency and authoritative conflict validation remain server responsibilities.

The local implementation lives in `src/lib/local-first/cortex-memory.ts`.
