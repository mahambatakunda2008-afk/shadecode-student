# Zero-Network Release Profile

A packaged Shadecode Student release is not considered offline-ready merely because its pages open without a connection.

## Required at install

- Application shell
- Local database/runtime
- Core curriculum content for the release target
- Deterministic learning engines
- Offline capability manifest
- Offline AI runtime
- At least one compatible local model tier for the target device class

## First launch

First launch must not require:

- Supabase
- remote authentication
- remote feature flags
- analytics
- cloud AI
- a network health check

A learner may create a local profile and begin learning immediately. Account linking can happen later and must preserve local work.

## Model strategy

Use device-aware model tiers. Low-memory devices receive a small model or deterministic-only capabilities. WebGPU-capable devices can use a compact model. Native desktop/Android releases can ship a stronger model where storage and memory permit.

Do not bundle every model tier into every build. Select a release profile during packaging.

## Network return

When connectivity becomes available, synchronize local mutations to Supabase and download approved curriculum/model updates. Sync failures never block local work.

## Acceptance test

A release passes the offline gate only if a clean installed package can be launched with networking disabled and the learner can open the dashboard, access bundled curriculum, create a task, open Project Studio, save evidence, complete a deterministic quiz, and retain all work after restart.
