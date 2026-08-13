# Shadecode Distributed Infrastructure Architecture

## Status

**Proposed strategic architecture.**

This document supersedes the narrower framing in `docs/SHADECODE_DISTRIBUTED_INTELLIGENCE_ARCHITECTURE.md` as the strategic target. The earlier document remains useful historical context, but this document establishes the broader direction: Shadecode should decentralize not only AI, but as much of its computing, storage, content delivery, synchronization, and service infrastructure as is technically and economically sensible.

## Core principle

> **Users' devices are the infrastructure. Cloud is optional infrastructure, not the foundation.**

Shadecode should be designed so that increasing participation can increase the available network resources rather than simply increasing Shadecode's infrastructure bill.

This does **not** mean pretending that centralized services are unnecessary. Authentication, discovery, governance, software distribution, security coordination, recovery, and difficult network paths may still require centralized or semi-centralized services. The goal is to make the central layer small, replaceable, resilient, and non-essential to ordinary learning and ordinary data exchange wherever practical.

---

## 1. The Bigger Idea

Shadecode should eventually become a **device-native distributed platform for education**.

A Shadecode node may be:

- a phone;
- tablet;
- laptop;
- desktop;
- home computer;
- school computer;
- school/community edge node;
- university or polytechnic node;
- library/community learning node;
- future dedicated Shadecode hardware.

A node can contribute some combination of:

- compute;
- storage;
- AI models;
- educational resources;
- bandwidth;
- cached results;
- synchronization;
- local services;
- sensors or other capabilities where explicitly permitted.

A device is therefore not merely a client. It can be part of the platform itself.

---

## 2. What Can Be Decentralized?

The target is broader than decentralized AI.

### Intelligence

- local AI inference;
- peer AI inference;
- recommendations;
- personalization;
- OCR;
- mathematics processing;
- semantic search;
- translation;
- speech processing;
- lesson adaptation.

### Knowledge

- lessons;
- explanations;
- worked examples;
- flashcards;
- question banks;
- revision packs;
- permitted educational media;
- generated educational resources.

### Storage

- content caches;
- replicated resources;
- local indexes;
- encrypted personal data across personal devices;
- community educational libraries.

### Compute

- CPU workloads;
- GPU workloads;
- NPU workloads;
- bounded inference;
- indexing;
- validation;
- transformation jobs.

### Synchronization

- personal device synchronization;
- local-network synchronization;
- peer resource exchange;
- queued offline changes;
- eventual consistency for suitable data.

### Delivery

- peer content distribution;
- local educational CDN-like caching;
- school-network distribution;
- community resource replication.

### Services

Where technically appropriate, future Shadecode services may be provided by participating nodes rather than one central server.

The design question for every subsystem becomes:

> **Does this genuinely need a central service, or can the user's devices provide it safely and reliably?**

---

## 3. The Network Model

The long-term architecture should look like this:

```text
                     SHADECODE NETWORK

      +-------------------+-------------------+
      |                   |                   |
   Device A           Device B            Device C
      |                   |                   |
   local AI            storage             compute
      |                   |                   |
      +-------------------+-------------------+
                          |
                       ShadeNet
                          |
          +---------------+---------------+
          |               |               |
       School          Community       Personal
        node             node           devices
          |               |               |
          +---------------+---------------+
                          |
                optional central services
                          |
                 optional cloud AI
```

The cloud is deliberately drawn as an optional layer rather than the root of the architecture.

---

## 4. Local-First Is the Foundation

Before peer distribution, the application must be able to operate locally.

The preferred progression is:

```text
LOCAL
  ↓
PERSONAL DEVICE FEDERATION
  ↓
NEARBY PEERS
  ↓
SHADECODE / SCHOOL EDGE
  ↓
WIDER NETWORK
  ↓
OPTIONAL CLOUD
```

A request should not leave the device merely because a central server exists.

Local execution is preferred when it provides sufficient quality, speed, privacy, and reliability.

---

## 5. Distributed Intelligence

Cortex should eventually route an intelligent task according to policy and capability.

```text
                       REQUEST
                          |
                          v
                 Cortex Policy Gate
                          |
                +---------+---------+
                |                   |
          Private context       Shareable context
                |                   |
                v                   v
             LOCAL             NETWORK ROUTER
                                  |
                +-----------------+-----------------+
                |                 |                 |
              PEERS             EDGE             CLOUD*

* optional and used when justified
```

The routing score should consider:

- privacy;
- required accuracy;
- model availability;
- latency;
- network quality;
- battery state;
- device load;
- compute capability;
- bandwidth cost;
- cloud cost;
- node trust;
- task urgency;
- offline constraints.

The goal is not simply **cheapest**. It is the best acceptable execution location under the user's policy.

---

## 6. The Cloud Is an Optional Capability

External AI providers can remain useful for:

- very large models;
- specialized models;
- heavyweight multimodal generation;
- large training jobs;
- unusual workloads;
- temporary capacity shortages;
- recovery and bootstrap scenarios.

However:

> **Shadecode's identity must not be "an app that calls an AI API."**

External providers should be adapters behind an intelligence interface, not architectural dependencies embedded throughout the product.

If every external provider disappears temporarily, Shadecode should still retain meaningful learning functionality through local resources, local models, cached knowledge, and peer/edge resources.

---

## 7. No Expensive Shadecode Datacenter Is Required as the Default Model

The architecture intentionally aims to avoid requiring Shadecode to purchase enormous centralized compute capacity merely because the user base grows.

Traditional scaling:

```text
More users
   ↓
More server load
   ↓
More servers
   ↓
More infrastructure cost
```

Distributed scaling can instead look like:

```text
More users
   ↓
More participating devices
   ↓
More aggregate compute/storage/cache capacity
   ↓
More network capacity
```

This is not a guarantee that every additional user increases capacity. Many devices will contribute nothing, and some workloads remain centralized. It is a strategic economic objective, not a magical law of networking.

---

## 8. Device Capability Profiles

Each participating node should expose a privacy-safe capability profile.

```text
CPU:             available
GPU:             available / unavailable
NPU:             available / unavailable
RAM:             capacity class
Storage:         contribution quota
Battery:         policy state
Network:         quality class
Models:          compatible model IDs
Current load:    bounded estimate
Trust:           network reliability state
```

Do not expose unnecessary hardware fingerprints or personal information.

Capabilities should be advertised for scheduling, not for surveillance.

---

## 9. Personal Device Federation

Before asking another user for resources, a student's own devices should cooperate.

```text
             PERSONAL NETWORK

Phone <------> Laptop <------> Desktop
  |              |               |
  +--------------+---------------+
                 |
          encrypted personal state
```

Possible uses:

- a laptop provides compute to a phone;
- a desktop stores a larger educational cache;
- a phone syncs new notes when it reaches the home network;
- models are downloaded once and reused across devices;
- personal AI state remains under the user's control.

This should be a private trust domain by default.

---

## 10. Peer-to-Peer ShadeNet

After personal federation, devices can optionally participate in the wider ShadeNet.

```text
Student A <------> Student B
     ^                 ^
     |                 |
     v                 v
Student C <------> School Node
```

Peer functions can include:

- resource retrieval;
- content replication;
- bounded inference;
- indexing;
- validation;
- synchronization;
- local service discovery.

Peer participation must always respect explicit device and user policy.

---

## 11. Distributed Storage and Educational CDN

Shadecode should treat frequently used educational content as replicated objects rather than repeatedly downloading the same object from a central server.

A resource can be:

```text
created
  ↓
content ID
  ↓
local cache
  ↓
peer replicas
  ↓
school/community cache
  ↓
optional central backup
```

Content addressing should use a cryptographic digest of canonical content.

This enables:

- deduplication;
- integrity checks;
- cache lookup;
- replica discovery;
- version identification;
- efficient recovery.

Replication must respect licensing and content ownership.

---

## 12. Distributed Compute

Compute contribution should be optional.

Users can choose policies such as:

- never contribute;
- Wi-Fi only;
- charging only;
- CPU only;
- GPU/NPU allowed;
- maximum CPU usage;
- maximum battery impact;
- maximum bandwidth;
- only known peers;
- only school/community network;
- only approved educational workloads.

Shadecode must never silently turn a student's device into an unpaid compute worker.

Contribution should be visible, reversible, and resource-limited.

---

## 13. Peer Compute Must Use Safe Workloads

A peer should never receive arbitrary code to execute.

The protocol should define approved workload classes:

- model inference;
- content hashing;
- indexing;
- document transformation;
- validation;
- bounded data processing.

Execution should be sandboxed where possible.

A workload should describe **what operation is requested**, not grant arbitrary execution privileges.

---

## 14. Trust Is Infrastructure

A decentralized platform cannot assume every node is honest.

Trust must cover:

- device identity;
- capability claims;
- execution reliability;
- resource provenance;
- model provenance;
- result verification;
- abuse history;
- revocation.

A node can have a reliability score without creating a permanent social score attached to the student.

High-value jobs may use multiple independent nodes and compare results.

Low-risk cache retrieval may use a single verified copy.

Verification should be proportional to risk.

---

## 15. Privacy Boundary

The network must distinguish **personal state** from **shareable resources**.

### Private by default

- conversations;
- learning history;
- Cortex memories;
- weaknesses;
- analytics;
- timetable;
- private notes;
- account data;
- personal learning plans.

### Shareable only with permission / valid rights

- published lessons;
- public question sets;
- teacher resources;
- community study packs;
- licensed educational media;
- approved model artifacts.

A device contributing compute must not automatically contribute the owner's private learning data.

---

## 16. Federated Learning

A later generation of the network may support privacy-preserving model improvement.

```text
Device A -> local learning -> update
Device B -> local learning -> update
Device C -> local learning -> update
                     |
                     v
             secure aggregation
                     |
                     v
                 model update
```

Potential safeguards:

- secure aggregation;
- differential privacy;
- clipping;
- anomaly detection;
- robust aggregation;
- signed model/update artifacts.

This is a later phase, after identity, trust, privacy, and update verification are mature.

---

## 17. Local and Community Edge Nodes

A school, university, polytechnic, library, or community can become a local Shadecode cluster.

A local node may provide:

- educational cache;
- local search index;
- local model registry;
- AI inference;
- synchronization;
- past-paper distribution;
- curriculum resources;
- community learning resources.

Students on the same local network could obtain resources without every device needing an internet connection.

This is particularly valuable where data is expensive or connectivity is intermittent.

---

## 18. Offline and Disconnected Operation

Disconnection should be a normal operating state, not an exception.

A student should be able to:

1. synchronize while connected;
2. cache resources/models;
3. study offline;
4. run supported local intelligence;
5. exchange resources locally;
6. queue changes;
7. synchronize when connectivity returns.

Peer-to-peer should extend offline capability rather than merely provide a faster cloud path.

---

## 19. Control Plane vs Data Plane

Central coordination and distributed payloads should be deliberately separated.

### Minimal control plane

Potential responsibilities:

- account authentication;
- identity bootstrap;
- discovery/signaling;
- policy distribution;
- security updates;
- model manifests;
- resource indexes where necessary;
- abuse controls;
- governance;
- emergency revocation.

### Distributed data plane

Potential responsibilities:

- educational resources;
- cached AI results;
- peer inference;
- local synchronization;
- model artifacts where licensed;
- search indexes;
- media delivery;
- local services.

The central layer should coordinate the network without becoming the mandatory path for every payload.

---

## 20. P2P Transport

WebRTC DataChannel is one candidate for browser-based peer communication. Native/mobile/desktop implementations may use additional transports appropriate to their platform.

The system should support:

- authenticated peers;
- encrypted connections;
- chunked transfers;
- resumable transfers;
- content integrity checks;
- relay fallback when direct connectivity fails.

A relay is a compatibility mechanism, not proof that the architecture is centralized.

---

## 21. Distributed Services Beyond AI

The same node protocol should eventually support services that are not AI at all.

Examples:

- search indexing;
- content conversion;
- document OCR;
- media transcoding;
- local analytics;
- cache warming;
- resource validation;
- synchronization assistance;
- educational dataset processing.

Each service must define its privacy, security, resource, and verification requirements.

The long-term goal is a **distributed service substrate**, not a distributed LLM gimmick.

---

## 22. What Should Remain Centralized?

Not everything should be decentralized.

Central or semi-central coordination may remain appropriate for:

- identity bootstrapping;
- emergency security controls;
- legal takedown coordination;
- account recovery;
- software signing and release channels;
- governance;
- authoritative metadata;
- subscription/billing state;
- global abuse prevention.

The test is not "Can this be decentralized?"

The test is:

> **Does decentralizing it improve resilience, cost, privacy, access, or capability enough to justify the complexity and risk?**

---

## 23. Cloud Independence Goal

The target is not absolute cloud elimination.

The target is **cloud independence for ordinary operation**.

A useful resilience test is:

> If external AI providers and the main cloud data path become unavailable for a period, can students still learn, retrieve existing resources, run supported local intelligence, communicate with permitted peers, and synchronize later?

If the answer becomes yes, Shadecode has achieved meaningful infrastructure independence.

---

## 24. Economic Model

The economic objective is to reduce the marginal cost of serving ordinary educational workloads.

```text
Centralized model:
users ↑ -> centralized compute ↑ -> operating cost ↑

Distributed model:
users ↑ -> possible participating resources ↑
                       |
                       +-> compute
                       +-> storage
                       +-> cache
                       +-> bandwidth
```

This is not guaranteed linear scaling.

The system still incurs costs for:

- coordination;
- relay traffic;
- security;
- storage of authoritative state;
- software distribution;
- moderation;
- cloud fallback;
- operations.

The goal is to make those costs substantially smaller than operating the entire workload centrally.

---

## 25. Contribution and Incentives

A later version may reward useful contribution, but this is not required for the initial network.

Possible contribution dimensions:

- reliable compute;
- storage;
- useful cache capacity;
- network availability;
- verified resources.

The system should avoid speculative tokenization as a prerequisite for participation.

Any reward mechanism must not pressure students into unsafe battery usage, expensive mobile data, or hardware wear.

---

## 26. Scaling Strategy

Shadecode should become more decentralized gradually.

### Early stage

```text
Local -> small central services -> cloud when needed
```

### Growing network

```text
Local -> personal devices -> nearby peers -> cloud
```

### Mature network

```text
Local
  ↓
Personal federation
  ↓
ShadeNet peers
  ↓
School/community nodes
  ↓
Regional nodes
  ↓
Optional cloud resources
```

The network should be designed so that participation can increase useful capacity without forcing Shadecode to own every CPU, GPU, and storage device.

---

## 27. Do Not Start With Giant Distributed LLMs

Distributed model partitioning across unreliable phones is a later research problem, not the first implementation target.

The first useful distributed workloads are:

1. content discovery;
2. content caching;
3. resource transfer;
4. local search/indexing;
5. small/bounded inference;
6. validation;
7. synchronization;
8. federated learning experiments;
9. advanced distributed inference only after measurement.

The network should become useful before it becomes exotic.

---

## 28. Architecture Relationship

The Shadecode stack should eventually resemble:

```text
+--------------------------------------------------+
| Shadecode Products                               |
| Student | SCS | Idea Vault | future products    |
+--------------------------------------------------+
| Cortex / Product Intelligence                    |
+--------------------------------------------------+
| Distributed Service Router                       |
| local | personal | peer | edge | optional cloud |
+--------------------------------------------------+
| ShadeNet                                         |
| discovery | trust | P2P | replication | indexes |
+--------------------------------------------------+
| Local-first data + device storage                |
+--------------------------------------------------+
| Minimal control plane                            |
| identity | security | governance | bootstrap    |
+--------------------------------------------------+
```

Shadecode Student is an application.

Cortex is the intelligence layer.

ShadeNet is the distributed network substrate.

The distributed infrastructure layer makes user devices first-class participants in that substrate.

---

## 29. Relationship to Existing Cortex Development Agent

The repository's autonomous Cortex development agent remains a separate system.

```text
Runtime Cortex
  -> student intelligence
  -> learning adaptation
  -> distributed routing

Development Cortex
  -> repository analysis
  -> autonomous development tasks
  -> PR generation
```

The development agent must never receive unrestricted access to arbitrary user devices merely because the runtime platform becomes distributed.

---

## 30. Security Requirements

The distributed platform must eventually provide:

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

Security is part of the architecture, not a later polish layer.

---

## 31. Educational Integrity

Distributed content creates a new provenance problem.

Resources should carry metadata such as:

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

Possible trust labels:

- official/verified;
- teacher-created/verified;
- community-created;
- AI-generated;
- unverified.

Replication must respect copyright, licenses, publisher permissions, and takedown requirements.

A resource being widely replicated does not make it academically authoritative.

---

## 32. Implementation Roadmap

### Phase 0: Architecture and contracts

- define node terminology;
- define privacy domains;
- define capability schema;
- define resource schema;
- define content IDs;
- define workload classes;
- define trust states;
- define routing interface.

### Phase 1: Local-first substrate

- local storage;
- offline queue;
- local resource index;
- local model interface;
- capability detection;
- content-addressed cache.

### Phase 2: Personal federation

- device pairing;
- encrypted personal sync;
- personal resource transfer;
- local device discovery;
- personal-node routing.

### Phase 3: P2P content network

- peer discovery;
- authenticated sessions;
- encrypted transfer;
- chunking/resume;
- integrity verification;
- relay fallback.

### Phase 4: Distributed services

- peer indexing;
- OCR;
- resource validation;
- bounded inference;
- cache replication;
- service scheduling.

### Phase 5: School/community nodes

- local cluster mode;
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

Only after the network is stable:

- heterogeneous compute scheduling;
- accelerator-aware workloads;
- advanced distributed inference;
- larger collaborative workloads.

---

## 33. Immediate Engineering Priorities

Do not rewrite the entire application around this idea immediately.

The next engineering work should be:

1. preserve the existing working application;
2. strengthen local-first storage and offline behavior;
3. define content-addressed educational resources;
4. define a `Node` capability model;
5. define a `Resource` model;
6. define a `Workload` model;
7. define a `TrustState` model;
8. create a local-only node simulator;
9. prototype device-to-device resource transfer;
10. add peer retrieval behind a feature flag;
11. measure bandwidth, battery, latency, reliability, and cost;
12. only then enable bounded peer compute.

The first prototype should be useful even with **zero external cloud AI calls** for the workloads it supports.

---

## 34. Success Metrics

### Infrastructure

- percentage of ordinary requests resolved without cloud;
- cache hit rate;
- peer transfer success rate;
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
- node/job failure rates.

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
- student retention.

The ultimate metric remains educational value, not how many nodes we can recruit into a distributed system.

---

## 35. Architectural Decisions

1. Shadecode will pursue **device-native distributed infrastructure**, not merely decentralized AI.
2. User devices are potential first-class infrastructure nodes.
3. Local execution is preferred where practical.
4. Personal-device federation precedes wider peer participation.
5. ShadeNet provides the distributed resource/network substrate.
6. Distributed intelligence is one major service on that substrate, not the entire purpose of it.
7. Cloud AI and cloud infrastructure remain optional capabilities and fallbacks.
8. The architecture must provide meaningful ordinary operation without continuous cloud dependence.
9. Compute contribution is opt-in, resource-limited, visible, and reversible.
10. Private student data remains private by default.
11. Peer workloads are constrained and sandboxed.
12. Content and model provenance are first-class concerns.
13. Centralized services are retained where they provide clear security, governance, bootstrap, or reliability value.
14. The system should become more capable as useful participation grows, while avoiding the claim that scaling is automatically linear.
15. The initial distributed implementation should focus on content, storage, synchronization, and bounded services before advanced distributed model inference.

---

## 36. The Long-Term Target

The mature Shadecode vision is:

```text
                     SHADECODE
                         |
          +--------------+--------------+
          |              |              |
       Student          SCS        Future apps
          |              |              |
          +--------------+--------------+
                         |
                       Cortex
                         |
                Distributed Router
                         |
       +-----------------+-----------------+
       |                 |                 |
     Local            ShadeNet           Edge
       |                 |                 |
       +-----------------+-----------------+
                         |
                  Optional cloud
```

And the network itself:

```text
          PHONE -------- LAPTOP
           /  \            / \
          /    \          /   \
       TABLET -- SCHOOL NODE -- DESKTOP
          \         |          /
           \        |         /
            COMMUNITY NODE
                   |
             optional cloud
```

The ambition is not to build another cloud service and then add a peer-to-peer feature.

The ambition is to build a **distributed educational computing network whose applications can use the resources already present in the hands of learners, educators, schools, communities, and institutions**.

That is the strategic direction.
