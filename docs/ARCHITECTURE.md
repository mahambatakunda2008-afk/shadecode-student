# Architecture

This describes how Shadecode Student is actually built, verified against the
repository rather than aspirational. See `docs/AUDIT_2026-08.md` and
`docs/FINAL_AUDIT_REPORT_2026-08.md` for the audit record.

> **Strategic direction:** `docs/SHADECODE_DISTRIBUTED_INFRASTRUCTURE_ARCHITECTURE.md` defines the proposed long-term evolution toward device-native distributed infrastructure. It expands the earlier distributed-AI proposal to include compute, storage, knowledge, synchronization, content delivery, and selected services. It is a strategic proposal and does not claim these capabilities are implemented today.

## Current system overview

Next.js App Router (TypeScript, Turbopack) deployed on Vercel, backed by
Supabase (Postgres + Auth + Storage). Authenticated app routes live under
`src/app/(app)/`; the layout there is a Client Component that gates access
via `useSession()` and Supabase's browser client.

## Auth model

- **Client-side:** `src/lib/supabase/client.ts` — browser client, respects RLS, used by Client Components for direct table reads/writes scoped to the logged-in user.
- **Server-side (session-respecting):** `src/lib/supabase/server.ts` — SSR client for API routes that need to know who is calling, still respects RLS.
- **Server-side (elevated):** `src/lib/supabaseClient.js` — raw client with the service-role key, bypasses RLS entirely. Routes using this must gate access themselves because RLS will not do it for them. See `src/lib/auth/rbac.ts`'s `hasUserRole()` for the standard pattern.
- **Admin auth currently has three conventions** (RBAC via `hasUserRole`, `ADMIN_REVIEW_TOKEN`, `ADMIN_SECRET`). They are currently safe but should eventually be consolidated.

## Current AI provider chain

`src/lib/ai.ts` is the single entry point (`callAI()`) for current AI-backed
features. Provider order is an implementation detail and may change. The
strategic architecture does **not** make any external AI provider a permanent
dependency.

`.cortex/cortex-engine.js` is a separate, older implementation with its own
model/provider handling and is not routed through `ai.ts`.

Every route that calls into the AI chain should apply rate limiting via
`@/lib/rate-limit/limiter`'s `applyRateLimit()`; this is not automatic.

## Cortex system

"Cortex" is the umbrella name for the learning-intelligence layer:

- `src/lib/cortex.ts` — event emission (`emitCortexEvent`), insight recording (`recordCortexInsight`, writes to `cortex_insights`), exam-driven updates (`updateCortexFromExam`)
- `src/lib/cortex/achievements.ts` — achievement logic, calls into `src/lib/xp/manager.ts`
- `src/lib/xp/manager.ts` — deliberately separates server-side and browser-side XP operations because their authentication/session contexts differ
- `.cortex/cortex-engine.js` — autonomous scheduled development agent, architecturally separate from runtime Cortex

### Strategic distributed Cortex direction

Runtime Cortex is expected to evolve from a cloud-oriented AI caller into a
policy-driven distributed intelligence router:

```text
Private context
    |
  LOCAL
    |
Personal device federation
    |
  ShadeNet
    |
School/community edge
    |
Optional cloud AI
```

The router should consider privacy, accuracy, latency, cost, battery,
bandwidth, capability, trust, availability, and offline constraints.

## Device-native distributed infrastructure direction

The long-term target is broader than distributed AI. User devices should be
first-class nodes that can optionally contribute compute, storage, models,
knowledge, synchronization, bandwidth, and bounded services.

```text
+--------------------------------------------------+
| Shadecode products                              |
+--------------------------------------------------+
| Cortex / product intelligence                   |
+--------------------------------------------------+
| Distributed service router                      |
| local | personal | peer | edge | optional cloud|
+--------------------------------------------------+
| ShadeNet                                        |
| discovery | trust | P2P | replication | indexes|
+--------------------------------------------------+
| Local-first data + device storage               |
+--------------------------------------------------+
| Minimal control plane                           |
| identity | security | governance | bootstrap   |
+--------------------------------------------------+
```

The cloud is an optional capability, not the conceptual root of the platform.
Central services remain where they provide clear value for identity, security,
governance, bootstrap, recovery, billing, or other functions that should not
be delegated to untrusted peers.

The implementation path is deliberately incremental:

```text
Existing Student
    -> local-first substrate
    -> content-addressed resources
    -> node/capability contracts
    -> personal device federation
    -> peer resource retrieval
    -> bounded peer services
    -> distributed Cortex routing
```

Every distributed layer should be independently measurable, feature-flagged,
and disableable so the working product is not destabilized by the research
architecture.

## Autonomous Cortex development agent

`.github/workflows/cortex.yml` runs `.cortex/cortex-engine.js` on a schedule
with write permissions. It is a development automation system, not part of the
runtime peer network.

Making Shadecode distributed must **not** grant this development agent
unrestricted access to user devices.

## Database

Schema and RLS policies live in `supabase/migrations/`, applied sequentially.
Migration files are not guaranteed to represent the entire live database state.
Always verify live RLS state before treating migration history as authoritative.

## CI/CD

`.github/workflows/ci.yml` runs typecheck, tests, and a real Next.js build on
push/PR to `main`. CI requires the relevant Supabase public environment
variables as repository secrets.

## Architectural caution

The distributed architecture is strategic and must not be confused with the
current implementation. In particular, peer compute, Internet-wide WebRTC,
distributed inference, and federated learning require additional engineering,
security controls, and real multi-device validation before being described as
production capabilities.
