# Cortex Local-First / Distributed Architecture

## Decision

Shadecode Student should not make Vercel or one AI provider the computational heart of Cortex.

Target architecture:

  Learner Device -> Cortex Intelligence -> Local Execution -> Optional Peer Execution -> Cloud Fallback

Vercel becomes primarily a delivery/control-plane surface: serve the app, authenticate sessions, deliver updates, and expose small coordination APIs.

## Three execution layers

### 1. Deterministic local intelligence

Runs on the device: learner context, subject enforcement, curriculum resolution, topic decomposition, prerequisites, mastery calculations, question selection, difficulty adjustment, progress, math, rendering, cached curriculum, validation and generation state.

### 2. Local model execution

When a real browser/device model is installed and ready, generative work executes locally. The runtime must detect actual model readiness and never pretend a local model exists.

### 3. Distributed execution

Peers can optionally contribute compute or cached knowledge. This requires explicit opt-in, authenticated ephemeral sessions, encrypted transport, task isolation, quotas and integrity validation. Peer execution is an accelerator, not a dependency.

## Cloud role

Cloud is the connection and recovery layer: authentication, synchronization, curriculum/version distribution, durable backups, optional model fallback and cross-device state.

## Execution ladder

  DETERMINISTIC LOCAL -> BROWSER MODEL -> PEER -> CLOUD -> CACHED/DETERMINISTIC RECOVERY

Not every workflow supports every rung. Security-sensitive operations may bypass peers.

## Critical distinction

Decentralized does not mean sending student data to random computers. Until the peer protocol guarantees consent, encryption, authentication, task isolation, cancellation, timeout and integrity validation, peer-assisted execution remains a capability slot rather than a live data-sharing path.

## Vercel strategy

Vercel should eventually serve a mostly-static Next.js shell and small control-plane routes. Heavy AI execution should move out of Vercel.

That means no long synchronous lesson generation from a Vercel request, no retry storms against Vercel Functions, no polling loops that keep Functions busy, and no large AI payloads through the app server when the browser can execute them.

## Migration

Phase A: centralize execution policy, preserve the current cloud path as fallback, keep generation IDs and honest progress.

Phase B: move curriculum, learner context, planning, validation and adaptation completely client-side.

Phase C: add a real browser inference runtime behind capability detection.

Phase D: synchronize only state required across devices.

Phase E: introduce opt-in peer compute for compatible stateless tasks.

Phase F: make cloud generation the last-resort fallback.

## Reliability goal

If Vercel is unavailable, an installed Student client with local assets should still open, show saved lessons, study offline, run deterministic intelligence, continue supported local generation and queue synchronization.