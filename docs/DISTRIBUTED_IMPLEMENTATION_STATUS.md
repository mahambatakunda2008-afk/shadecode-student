# Distributed Platform Implementation Status

Updated: 2026-08-17

This document separates **landed engineering** from the long-term distributed-infrastructure proposal. It prevents strategic capabilities from being mistaken for production features.

## Landed foundations

### Local-first synchronization contracts

- typed create/update/delete operation envelopes;
- stable installation/device identity boundary;
- Lamport clock metadata;
- deterministic operation ordering;
- deterministic conflict winner selection;
- tombstone representation;
- schema versioning;
- IndexedDB operation store;
- durable tombstone store;
- synchronization cursor store;
- acknowledgement state for pending operations.

### Device-node contracts

- node kinds;
- coarse CPU/GPU/NPU capability classes;
- memory/storage quotas;
- network class;
- battery policy;
- trust state;
- workload types;
- workload privacy classes;
- conservative workload admission;
- execution-target selection;
- node scoring.

### Content-addressed resources

- resource manifest;
- SHA-256 content IDs;
- content-ID validation;
- shareability validation;
- integrity verification.

## Important limitation

These foundations do **not** mean ShadeNet is already a production P2P network. There is currently no claim here that browsers can discover arbitrary peers, exchange resources directly, execute peer workloads, or perform distributed inference in production.

## Next engineering slice

Tracked by GitHub issue #172:

1. signed node advertisements;
2. authenticated pairing;
3. peer-discovery abstraction;
4. request/response protocol;
5. chunked/resumable resource transfer;
6. integrity verification at the receiving node;
7. browser capability detection;
8. two-node simulator;
9. feature flag and kill switch;
10. latency/bandwidth/failure measurements.

## Safety gates

Before enabling peer compute:

- unknown and revoked nodes must be rejected;
- private workloads must not leave the user's trust domain by default;
- arbitrary remote code execution must be impossible;
- compute contribution must be explicit, bounded and reversible;
- resource/model provenance must be verifiable;
- replay and revocation controls must exist;
- battery, data and storage limits must be enforced;
- existing product behavior must remain functional when the distributed layer is disabled.

## Current architecture relationship

```text
Current Student
      |
      +-- local-first sync foundation        [LANDED]
      |
      +-- device/node contracts               [LANDED]
      |
      +-- content-addressed resources         [LANDED]
      |
      +-- authenticated peer discovery        [NEXT]
      |
      +-- peer resource exchange              [NEXT]
      |
      +-- bounded peer services               [LATER]
      |
      +-- distributed Cortex routing          [LATER]
      |
      +-- advanced distributed compute        [RESEARCH]
```

See `docs/SHADECODE_DISTRIBUTED_INFRASTRUCTURE_ARCHITECTURE.md` for the strategic target and `docs/ARCHITECTURE.md` for the current application architecture.
