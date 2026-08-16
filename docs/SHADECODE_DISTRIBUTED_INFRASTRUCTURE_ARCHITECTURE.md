# Shadecode Distributed Infrastructure Architecture

## Status

**Strategic proposal.** This document defines the long-term architecture for a Shadecode platform in which user devices are first-class infrastructure nodes. It supersedes the narrower framing of distributed AI as the strategic target.

> **Core principle: users' devices are the infrastructure. Cloud is optional infrastructure, not the foundation.**

This is a target architecture, not a claim that peer compute, distributed inference, or all services below are implemented today.

## 1. Vision

Shadecode should evolve from a conventional cloud application into a **device-native distributed educational platform**.

The platform should be able to use, where appropriate and explicitly permitted:

- phones;
- tablets;
- laptops;
- desktops;
- school computers;
- university and polytechnic devices;
- community/library nodes;
- dedicated edge devices in the future.

A node can contribute some combination of compute, storage, bandwidth, cached knowledge, models, synchronization, indexing, and bounded services.

The device is therefore not merely a client. It can be part of the platform.

## 2. Decentralization Scope

The goal is broader than decentralized AI.

### Intelligence

- local inference;
- peer inference;
- recommendations;
- personalization;
- OCR;
- mathematics processing;
- translation;
- semantic search;
- speech processing;
- lesson adaptation.

### Knowledge and content

- lessons;
- explanations;
- worked examples;
- flashcards;
- question banks;
- revision resources;
- permitted media;
- generated educational resources.

### Storage

- local caches;
- replicated educational resources;
- local indexes;
- community resource libraries;
- encrypted personal state across trusted personal devices.

### Compute

- CPU jobs;
- GPU jobs;
- NPU jobs;
- bounded inference;
- indexing;
- validation;
- document transformation.

### Synchronization and delivery

- personal-device synchronization;
- local-network synchronization;
- peer resource exchange;
- queued offline changes;
- school/community caching;
- peer content delivery.

### Non-AI services

Where it is genuinely useful and safe, nodes may provide services such as search indexing, OCR, media processing, cache warming, resource validation, and synchronization assistance.

The design question for every subsystem becomes:

> **Does this genuinely need a central service, or can user devices provide it safely and reliably?**

## 3. Target Topology

```text
                         SHADECODE
                             |
             +---------------+---------------+
             |               |               |
          Student           SCS        Future apps
             |               |               |
             +---------------+---------------+
                             |
                           Cortex
                             |
                    Distributed Router
                             |
          +------------------+------------------+
          |                  |                  |
        LOCAL            ShadeNet             EDGE
          |                  |                  |
   personal devices     peers/nodes     school/community
          +------------------+------------------+
                             |
                  optional central services
                             |
                     optional cloud/AI
```

The cloud is an optional capability rather than the root of the architecture.

## 4. Local-First Foundation

The preferred execution path is:

```text
LOCAL
  -> PERSONAL DEVICE FEDERATION
  -> NEARBY PEERS
  -> SCHOOL/COMMUNITY EDGE
  -> WIDER SHADECODE NETWORK
  -> OPTIONAL CLOUD
```

A request should not leave the device merely because a server exists.

Local execution wins when it provides sufficient quality, privacy, speed, battery efficiency, and reliability.

## 5. Personal Device Federation

A user's own devices should cooperate before the platform asks other users for resources.

```text
Phone <------> Laptop <------> Desktop
   |              |               |
   +--------------+---------------+
                  |
        encrypted personal state
```

Possible uses include:

- a laptop providing compute to a phone;
- a desktop holding a larger educational cache;
- models downloaded once and reused across personal devices;
- offline changes queued on one device and synchronized through another;
- private Cortex state remaining inside the user's trust domain.

Personal federation is private by default.

## 6. ShadeNet Peer Layer

After personal federation, devices can optionally participate in the wider ShadeNet network.

```text
Student A <------> Student B
     ^                 ^
     |                 |
     v                 v
Student C <------> School Node
```

Peer services can include:

- resource retrieval;
- content replication;
- bounded inference;
- indexing;
- validation;
- synchronization;
- local service discovery.

Participation must respect explicit user and device policies.

## 7. Distributed Cortex

Cortex should become a policy-driven intelligence router rather than merely a cloud API caller.

```text
                        REQUEST
                           |
                    Cortex Policy Gate
                           |
              +------------+------------+
              |                         |
        private context           shareable task
              |                         |
            LOCAL                distributed router
                                      |
                 +--------------------+------------------+
                 |                    |                  |
               PEERS                EDGE             CLOUD*

* optional
```

Routing should consider:

- privacy;
- accuracy requirements;
- model availability;
- latency;
- network quality;
- battery state;
- device load;
- CPU/GPU/NPU capability;
- bandwidth;
- external cost;
- node trust;
- task urgency;
- offline constraints.

The objective is the best acceptable execution location, not simply the cheapest location.

## 8. Cloud Independence

External AI providers remain useful for very large models, specialized models, heavyweight multimodal workloads, large training jobs, unusual capacity requirements, and recovery/bootstrap scenarios.

They should be adapters behind a stable intelligence interface rather than dependencies spread throughout product code.

A resilience goal is:

> If external AI providers and the normal cloud data path become unavailable temporarily, students should still retain meaningful learning functionality through local models/resources, cached knowledge, peer resources where available, and later synchronization.

This does not require absolute elimination of cloud infrastructure.

## 9. Device Capability Model

A participating node should expose a privacy-safe capability profile such as:

```text
CPU capability class
GPU capability class
NPU capability class
RAM capacity class
Storage contribution quota
Battery policy state
Network quality class
Supported model IDs
Current load class
Trust/reliability state
```

Do not expose unnecessary hardware fingerprints or personal information. Capability discovery exists for scheduling, not surveillance.

## 10. Distributed Storage and Content Addressing

Frequently used educational resources should be replicated rather than repeatedly fetched from one origin.

```text
resource
   -> canonical representation
   -> cryptographic content ID
   -> local cache
   -> peer replicas
   -> school/community cache
   -> optional authoritative backup
```

Content addressing enables deduplication, integrity checks, replica discovery, version identification, and recovery.

Replication must respect copyright, licensing, publisher permissions, and takedown requirements.

## 11. Distributed Compute

Compute contribution is optional and policy controlled.

Possible policies include:

- never contribute;
- Wi-Fi only;
- charging only;
- CPU only;
- GPU/NPU allowed;
- maximum CPU usage;
- maximum battery impact;
- maximum bandwidth;
- known peers only;
- school/community network only;
- approved educational workloads only.

Shadecode must never silently turn a student's device into an unpaid compute worker.

Contribution must be visible, reversible, resource-limited, and easy to disable.

## 12. Safe Workloads

Peers must not receive arbitrary code for execution.

Workloads should be constrained to approved operations such as:

- model inference;
- content hashing;
- indexing;
- document transformation;
- validation;
- bounded data processing.

Where possible, execution should be sandboxed and quota-limited. A workload describes an allowed operation, not arbitrary execution privileges.

## 13. Trust and Verification

A decentralized network must assume some nodes can be unreliable or malicious.

Trust infrastructure should cover:

- node identity;
- capability claims;
- execution reliability;
- resource provenance;
- model provenance;
- result verification;
- abuse history;
- revocation.

High-risk jobs can use multiple independent nodes and compare results. Low-risk verified cache retrieval may require less redundancy. Verification should be proportional to risk.

Reliability scores should not become permanent social scores attached to students.

## 14. Privacy Boundaries

The network must clearly separate private state from shareable resources.

Private by default:

- conversations;
- learning history;
- Cortex memories;
- weaknesses and analytics;
- timetable;
- private notes;
- account data;
- personal learning plans.

Shareable only with permission or valid rights:

- published lessons;
- public question sets;
- teacher resources;
- community study packs;
- licensed educational media;
- approved model artifacts.

A device contributing compute must not automatically contribute its owner's private learning data.

## 15. School, University, Polytechnic and Community Nodes

A school, university, polytechnic, library, or community can operate a local Shadecode cluster.

A local node may provide:

- educational caches;
- local search indexes;
- model registries;
- AI inference;
- synchronization;
- past-paper distribution;
- curriculum resources;
- community learning resources.

This is especially valuable where internet access is expensive or intermittent.

## 16. Offline Operation

Disconnection should be a normal operating state.

A learner should be able to:

1. synchronize while connected;
2. cache resources and supported models;
3. study offline;
4. run supported local intelligence;
5. exchange resources locally;
6. queue changes;
7. synchronize when connectivity returns.

Peer-to-peer should extend offline capability, not merely provide another path to the cloud.

## 17. Control Plane and Data Plane

### Minimal control plane

Central or semi-central coordination may handle:

- identity bootstrap;
- discovery/signaling;
- policy distribution;
- security updates;
- model manifests;
- authoritative metadata;
- abuse controls;
- governance;
- emergency revocation;
- account recovery;
- software signing and release channels.

### Distributed data plane

Nodes can handle:

- educational resources;
- caches;
- peer inference;
- local synchronization;
- search indexes;
- media delivery;
- bounded services.

The central layer should coordinate the network without becoming the mandatory path for every payload.

## 18. P2P Transport

WebRTC DataChannel is one candidate for browser-based peer communication. Native/mobile/desktop implementations can use platform-appropriate transports.

The protocol should support:

- authenticated peers;
- encrypted connections;
- chunked transfers;
- resumable transfers;
- content integrity checks;
- relay fallback when direct connectivity fails.

A relay is a connectivity mechanism, not a requirement that the whole architecture be centralized.

## 19. Distributed Services Beyond AI

The node protocol should eventually support non-AI services when they are demonstrably useful:

- search indexing;
- OCR;
- document conversion;
- media transcoding;
- local analytics;
- cache warming;
- resource validation;
- synchronization assistance;
- educational dataset processing.

Every service needs its own privacy, security, resource, and verification policy.

The goal is a distributed service substrate, not a distributed-LLM gimmick.

## 20. What Should Stay Centralized?

Not everything should be decentralized.

Central or semi-central coordination remains appropriate for functions such as:

- identity bootstrapping;
- emergency security controls;
- account recovery;
- software signing;
- governance;
- authoritative metadata;
- billing/subscription state where applicable;
- global abuse prevention;
- legal/takedown coordination.

The decision test is:

> **Does decentralizing this subsystem improve resilience, cost, privacy, access, or capability enough to justify the added complexity and risk?**

## 21. Economics

Traditional scaling is approximately:

```text
More users -> more centralized workload -> more infrastructure cost
```

The distributed objective is:

```text
More users
    -> more potential participating devices
    -> more aggregate compute/storage/cache capacity
```

This is not guaranteed linear scaling. Devices may contribute nothing, availability varies, and some workloads remain centralized. The objective is to reduce the amount of infrastructure Shadecode must own for ordinary workloads.

The system still incurs costs for coordination, security, relays, authoritative storage, software distribution, moderation, and optional cloud capacity.

## 22. Incentives

Network participation does not need a token economy.

A later system may recognize useful contribution such as reliable compute, storage, cache capacity, network availability, or verified resources.

Any incentive must never pressure students into unsafe battery usage, excessive mobile-data consumption, or unnecessary hardware wear.

## 23. Federated Learning

After identity, trust, privacy, and update verification are mature, the network may support privacy-preserving model improvement.

```text
Device A -> local update -+
Device B -> local update -+-> secure aggregation -> model update
Device C -> local update -+
```

Potential protections include secure aggregation, differential privacy, clipping, anomaly detection, robust aggregation, and signed model artifacts.

This is a later research phase, not a launch dependency.

## 24. Educational Integrity and Provenance

Distributed educational content creates a provenance problem. Replicated resources should carry metadata such as:

```text
content_id
resource_type
subject
qualification
syllabus
version
source
author/publisher
created_at
signature
verification_status
license
```

Useful trust labels include official/verified, teacher-created/verified, community-created, AI-generated, and unverified.

Replication never makes an unverified resource authoritative.

## 25. Scaling Strategy

### Early

```text
Local -> small central services -> optional cloud
```

### Growing

```text
Local -> personal devices -> nearby peers -> optional cloud
```

### Mature

```text
Local
  -> personal federation
  -> ShadeNet peers
  -> school/community nodes
  -> regional nodes
  -> optional cloud resources
```

The architecture should allow useful capacity to grow with participation without assuming every new user contributes resources.

## 26. Do Not Start With Giant Distributed LLMs

Partitioning a large model across unreliable phones is a research problem and should not be the first implementation target.

The first useful distributed workloads are:

1. content discovery;
2. content caching;
3. resource transfer;
4. local search/indexing;
5. small or bounded inference;
6. validation;
7. synchronization;
8. federated-learning experiments;
9. advanced distributed inference only after measurement.

The network should become useful before it becomes exotic.

## 27. Security Requirements

The platform will eventually require:

- authenticated node identity;
- encrypted communication;
- sandboxed workloads;
- signed software/model artifacts;
- content integrity verification;
- workload authorization;
- rate limits;
- resource quotas;
- abuse detection;
- node revocation;
- result verification;
- privacy-preserving telemetry;
- safe update mechanisms.

Security is architectural infrastructure, not a later polish layer.

## 28. Relationship to Current Shadecode Student

Current Shadecode Student remains the working product. The distributed architecture is additive and must not destabilize working features.

The progression should be:

```text
Existing Student
      |
local-first improvements
      |
content-addressed resources
      |
node/capability contracts
      |
personal device federation
      |
peer resource retrieval
      |
bounded peer services
      |
distributed Cortex routing
```

Each layer should be feature-flagged, measurable, and independently disableable.

## 29. Relationship to Cortex Development Automation

The repository's autonomous development Cortex is a separate system from runtime Cortex.

```text
Runtime Cortex
  -> learner intelligence
  -> learning adaptation
  -> distributed routing

Development Cortex
  -> repository analysis
  -> development tasks
  -> PR generation
```

Making Shadecode distributed must never grant the development agent unrestricted access to user devices.

## 30. Implementation Roadmap

### Phase 0: Contracts

- define Node capability schema;
- define Resource schema;
- define Workload schema;
- define TrustState;
- define privacy domains;
- define content IDs;
- define routing interface.

### Phase 1: Local-first substrate

- robust local storage;
- offline queue;
- local resource index;
- local model interface;
- capability detection;
- content-addressed cache.

### Phase 2: Personal federation

- secure device pairing;
- encrypted personal sync;
- personal resource transfer;
- local device discovery;
- personal-node routing.

### Phase 3: P2P content network

- peer discovery;
- authenticated sessions;
- encrypted transfers;
- chunking and resume;
- integrity verification;
- relay fallback.

### Phase 4: Distributed services

- peer indexing;
- OCR;
- resource validation;
- bounded inference;
- cache replication;
- service scheduling.

### Phase 5: Institution/community edge

- school cluster mode;
- university/polytechnic cluster mode;
- curriculum/resource cache;
- local model registry;
- local search;
- offline synchronization.

### Phase 6: Federated learning

- secure aggregation;
- privacy mechanisms;
- robust update handling;
- model update verification.

### Phase 7: Advanced distributed compute

Only after reliability and security are demonstrated:

- heterogeneous compute scheduling;
- accelerator-aware workloads;
- advanced distributed inference;
- larger collaborative workloads.

## 31. Immediate Engineering Priorities

Do not rewrite Shadecode Student around this architecture in one jump.

Priorities:

1. preserve the working product;
2. strengthen local-first storage and offline behavior;
3. define content-addressed educational resources;
4. define Node, Resource, Workload, and TrustState contracts;
5. build a local-only node simulator;
6. prototype device-to-device resource transfer;
7. add peer retrieval behind a feature flag;
8. measure latency, bandwidth, battery, reliability, and cost;
9. only then enable bounded peer compute.

The first prototype should provide meaningful functionality without external AI calls for workloads it supports.

## 32. Success Metrics

### Infrastructure

- ordinary requests resolved without cloud;
- cache hit rate;
- peer transfer success;
- local completion rate;
- cloud fallback rate;
- central bandwidth saved;
- central compute saved.

### Economics

- external inference calls avoided;
- cloud inference cost avoided;
- storage/egress savings;
- cost per active learner.

### Reliability

- offline learning completion;
- peer discovery success;
- synchronization recovery;
- content integrity failures;
- peer/job failure rate.

### Privacy and safety

- private-data containment;
- unauthorized workload attempts blocked;
- revoked-node containment;
- policy enforcement rate.

### Education

- lesson usefulness;
- practice completion;
- learning improvement;
- exam performance;
- retention.

The primary metric remains educational value, not network size.

## 33. Architectural Decisions

1. Shadecode will pursue **device-native distributed infrastructure**, not merely decentralized AI.
2. User devices are potential first-class infrastructure nodes.
3. Local execution is preferred where practical.
4. Personal-device federation precedes wider peer participation.
5. ShadeNet is the distributed network substrate.
6. Distributed intelligence is one major service on that substrate, not the entire purpose of it.
7. Cloud infrastructure and external AI remain optional capabilities and fallbacks.
8. Ordinary learning should become meaningfully useful without continuous cloud dependence.
9. Compute contribution is opt-in, resource-limited, visible, and reversible.
10. Private student data remains private by default.
11. Peer workloads are constrained and sandboxed.
12. Content and model provenance are first-class concerns.
13. Centralized services remain where they provide clear security, governance, bootstrap, recovery, or reliability value.
14. The system should become more capable as useful participation grows without promising linear scaling.
15. Initial distributed implementation focuses on content, storage, synchronization, and bounded services before advanced distributed inference.
16. Every distributed feature must be independently measurable and disableable.

## 34. Long-Term Target

The mature target is not a cloud application with a P2P feature attached.

It is a **distributed educational computing network whose applications use resources already present in the hands of learners, educators, schools, universities, polytechnics, communities, and institutions**.

Shadecode Student is an application.

Cortex is the intelligence layer.

ShadeNet is the network substrate.

The distributed infrastructure layer makes participating devices first-class infrastructure nodes.

Cloud remains available when it adds value, but it is no longer the conceptual center of the system.
