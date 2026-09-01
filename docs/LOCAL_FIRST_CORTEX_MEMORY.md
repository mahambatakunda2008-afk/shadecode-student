# Local-First Cortex Memory

This document is maintained on the device-first branch and describes persistent Cortex memory boundaries.

- Local learner context remains available without network access.
- Durable local state is the source of truth for learner mutations.
- Network synchronization is transport, not the primary state store.
- Server reconciliation must preserve authenticated ownership and deterministic conflict ordering.
