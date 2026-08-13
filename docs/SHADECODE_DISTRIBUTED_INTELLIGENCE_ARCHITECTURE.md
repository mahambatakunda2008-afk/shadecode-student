# Shadecode Distributed Intelligence Architecture

## Status

**Proposed strategic architecture.**

This document defines the long-term intelligence architecture for Shadecode Student and the wider Shadecode ecosystem. It extends the existing local-first and ShadeNet direction into a layered system in which intelligence can execute locally, across participating devices, on optional Shadecode edge infrastructure, or through external cloud AI providers.

The governing principle is:

> **Local first. Peer first. Shadecode network next. Cloud when necessary.**

The goal is not to eliminate servers or cloud AI. The goal is to make centralized infrastructure an augmentation layer rather than the mandatory execution path for every intelligent operation.

---

## 1. Vision

Shadecode should eventually operate as a **distributed intelligence network for education**.

Every participating device can potentially be:

- a learner and consumer of intelligence;
- a local AI inference node;
- a local knowledge and content cache;
- a publisher of explicitly shareable educational resources;
- a peer that provides computation to other peers;
- an offline synchronization point;
- a source of privacy-preserving learning signals;
- an optional member of a trusted school or community compute network.

The device is therefore not merely a client connected to Shadecode. It can become part of Shadecode's intelligence substrate.

---

## 2. The Five Intelligence Tiers

Shadecode should route intelligent work through increasingly expensive or centralized layers.

### Tier 0: Local intelligence

Execution entirely on the student's device.

Examples:

- small language models;
- OCR and handwriting recognition;
- embeddings;
- semantic search;
- retrieval from local educational content;
- recommendations;
- lesson adaptation;
- simple reasoning;
- speech processing where supported;
- cached AI responses;
- personal Cortex memory operations.

Primary advantages:

- no external inference cost;
- low latency;
- offline capability;
- strongest privacy boundary;
- resilience when disconnected.

### Tier 1: Personal device federation

The same student's devices cooperate.

```text
Phone <-> Laptop <-> Tablet
```

Possible uses:

- synchronize local models;
- move cached resources;
- share computation between a weak phone and stronger laptop;
- synchronize encrypted personal state;
- use a home computer as a personal intelligence node.

This remains private to the user unless the user explicitly enables wider sharing.

### Tier 2: ShadeNet peer intelligence

Different users' devices can contribute explicitly permitted resources and compute.

```text
Student A <-> Student B <-> Student C
```

Possible uses:

- retrieve a cached lesson;
- retrieve a generated question set;
- obtain a model available on a peer;
- execute an approved inference job on a capable peer;
- exchange educational resources over a local network;
- replicate popular public/community resources.

### Tier 3: Shadecode edge/community infrastructure

Optional dedicated nodes can provide stable local compute and storage.

Examples:

- school ShadeNet nodes;
- library/community nodes;
- campus nodes;
- home servers;
- low-cost edge devices;
- Shadecode-operated regional infrastructure.

These nodes are especially valuable where internet access is expensive or unreliable.

### Tier 4: Cloud intelligence

External or Shadecode-hosted cloud infrastructure handles workloads that cannot reasonably be executed locally or through the network.

Examples:

- very large models;
- heavyweight multimodal generation;
- large-scale training;
- complex media generation;
- workloads requiring specialized cloud accelerators;
- fallback when local/network capacity is unavailable.

Potential providers remain optional and replaceable. Shadecode should avoid making its architecture dependent on a single AI provider.

---

## 3. Distributed Intelligence Router

Cortex should eventually contain an intelligence router that selects the execution location for each job.

The router should optimize across:

- privacy;
- accuracy;
- latency;
- cost;
- battery consumption;
- available compute;
- network quality;
- model availability;
- node trust;
- workload size;
- urgency;
- offline requirements.

Conceptual routing:

```text
                    AI REQUEST
                        |
                        v
               Cortex Task Classifier
                        |
                Privacy / Policy Gate
                        |
                  Capability Router
                        |
        +---------------+---------------+
        |               |               |
      LOCAL           PEER          SHADECODE
        |               |              EDGE
        |               |               |
        +---------------+---------------+
                        |
                  Cloud fallback
                        |
                 External providers
```

A simple policy could be:

```text
if local_can_execute && policy_allows:
    local
else if trusted_peer_can_execute && network_is_good:
    peer
else if edge_node_available:
    edge
else:
    cloud
```

The real router should use a scored decision rather than a rigid if/else chain.

---

## 4. Capability-Aware Nodes

Every participating node should advertise a privacy-safe capability profile.

Conceptual capability vector:

```text
CPU capability      7/10
GPU capability      9/10
NPU capability      8/10
RAM availability    8/10
Battery             91%
Network quality     9/10
Latency              4 ms
Loaded models       Physics-7B, OCR-Lite
Current load        21%
Trust score         0.998
Storage available   38 GB
```

The profile should not expose unnecessary personal information.

Cortex can use the vector to select suitable nodes without knowing sensitive details about their owners.

---

## 5. Do Not Start With Giant Distributed LLM Inference

The first implementation should **not** attempt to split a large model across dozens of unreliable phones.

That creates difficult synchronization, bandwidth, memory, scheduling, and latency problems.

The recommended progression is:

1. local inference;
2. local caching;
3. peer content retrieval;
4. peer inference for bounded jobs;
5. federated learning and privacy-preserving learning signals;
6. school/community edge nodes;
7. advanced distributed inference only where the economics and reliability justify it.

The architecture should earn complexity gradually.

---

## 6. Distributed Knowledge Is as Important as Distributed Compute

Shadecode should not only distribute computation. It should distribute useful educational knowledge.

Potential shared resources:

- generated lessons;
- worked examples;
- flashcard decks;
- question sets;
- revision packs;
- syllabus-aligned resources;
- teacher-created material;
- permitted educational videos;
- public/community resources;
- cached AI outputs.

If one student generates a high-quality, shareable lesson, another student should be able to retrieve it rather than triggering another cloud generation unnecessarily.

Conceptually:

```text
Student A
   |
   | generates useful resource
   v
Content-addressed resource
   |
   +---- local cache
   +---- peer replicas
   +---- school node
   +---- optional cloud backup
              |
              v
        Student B / C / D
```

This turns the network into a **distributed educational cache**.

---

## 7. Content Addressing

Shareable educational resources should eventually use cryptographic content identifiers.

Conceptually:

```text
content_id = SHA-256(canonical_resource_bytes)
```

Benefits:

- integrity verification;
- duplicate detection;
- deduplication;
- efficient caching;
- reproducible references;
- safer peer transfer;
- easier replication;
- content-version tracking.

A resource should be treated as a content object with many possible replicas rather than as thousands of unrelated downloads.

---

## 8. Distributed Compute Contribution

Users may optionally allow their devices to contribute spare resources.

This must always be explicit and controllable.

Possible participation policies:

- never contribute;
- Wi-Fi only;
- charging only;
- CPU only;
- GPU/NPU allowed;
- maximum CPU percentage;
- maximum battery consumption;
- maximum bandwidth;
- only trusted peers;
- only school/community network;
- only educational workloads.

Shadecode must never silently consume a user's battery, mobile data, storage, or compute capacity for other users.

A contribution engine can schedule work only when device policy permits it.

---

## 9. Contribution Economics

The network can reduce the amount of paid external inference required.

Traditional pattern:

```text
N students -> cloud AI -> N model calls
```

Distributed pattern:

```text
local execution
      |
      v
peer/edge execution
      |
      v
cloud only when necessary
```

Similarly, repeated content generation can become:

```text
1 useful generation
       |
       v
cache + peer replication
       |
       v
many consumers
```

This does **not** mean infrastructure becomes literally free. Shadecode still has costs for coordination, storage, relays, moderation, security, model distribution, cloud fallback, and operations.

The economic objective is to move the marginal cost of ordinary intelligence closer to the devices and resources already present in the network.

---

## 10. Optional Intelligence Marketplace Model

A later ecosystem could support a contribution/reward model without exposing the complexity to ordinary students.

A device could contribute:

- compute;
- storage;
- bandwidth;
- cached educational resources;
- compatible local models.

The system could track contribution quality and reliability.

Any future monetary or non-monetary reward system must be designed separately from the technical node protocol and must not encourage unsafe battery, data, or hardware usage.

The initial system should prioritize **network utility and affordability**, not speculative tokenization.

---

## 11. Cortex as Distributed Intelligence

Cortex currently has two important but distinct meanings in the existing architecture:

1. the runtime learning-intelligence layer inside Shadecode Student;
2. the autonomous scheduled development agent that can analyze the repository and open pull requests.

The distributed architecture extends the first meaning. It does not automatically grant the autonomous development agent access to arbitrary peer devices.

Future runtime Cortex layers:

### Personal Cortex

Knows the student's private context:

- learning history;
- weaknesses;
- goals;
- study patterns;
- local memory;
- current subjects;
- revision state.

### Network Cortex

Works with privacy-preserving aggregate signals and public/shared resources.

It can identify patterns such as:

> Students studying a concept are repeatedly struggling with a particular prerequisite.

### Edge Cortex

Provides stable local intelligence for schools, communities, and campuses.

### Cloud Cortex

Handles heavyweight reasoning and generation.

The result is a layered intelligence system rather than a cloud API wrapper.

---

## 12. Cortex Retrieval Order

For a typical educational request, Cortex should eventually prefer:

1. private local memory;
2. local educational cache;
3. local semantic index;
4. personal device peers;
5. nearby ShadeNet peers;
6. school/community edge nodes;
7. wider network resources;
8. cloud-indexed resources;
9. cloud AI generation.

Private context should remain private even when the system retrieves a public resource from the network.

Example:

```text
"Teach me electromagnetic induction."

Cortex
 |
 +-- personal memory
 +-- local lessons
 +-- local past papers
 +-- personal device cache
 +-- nearby peers
 +-- ShadeNet
 +-- school node
 +-- cloud knowledge
 +-- generation if required
```

---

## 13. Network Intelligence vs Personal Intelligence

These boundaries must remain explicit.

### Personal

Private by default:

- Cortex memories;
- conversations;
- study history;
- personal notes;
- timetable;
- weaknesses;
- analytics;
- account information;
- private learning plans.

### Shareable

Explicitly published or licensed resources:

- generated lessons;
- public question sets;
- flashcards;
- teacher resources;
- permitted videos;
- community study packs.

A student's private learning state must never become network training data merely because their device participates in ShadeNet.

---

## 14. Federated Learning Direction

Long-term, Shadecode may improve models using federated or privacy-preserving learning.

Conceptual model:

```text
Device A -> local training -> update
Device B -> local training -> update
Device C -> local training -> update
                  |
                  v
        secure aggregation
                  |
                  v
           global update
```

Raw student data should remain on-device wherever possible.

Potential techniques include:

- secure aggregation;
- differential privacy;
- update clipping;
- anomaly detection;
- robust aggregation;
- model/update signing.

Federated learning should be introduced only after the node identity, trust, privacy, and update-verification foundations are mature.

---

## 15. Trust and Reputation

A distributed intelligence network must assume that some nodes will be faulty or malicious.

Trust should therefore be multi-layered.

### Node identity

Authenticated device identity and user/device pairing.

### Capability trust

A node claims what it can do, but claims should be verified where practical.

### Execution trust

Measure successful jobs, failures, latency, and abnormal behavior.

### Content trust

Verify content hashes, signatures, provenance, and publisher status.

### Reputation

Maintain a network reputation score based on observable behavior rather than personal identity.

Example:

```text
Node 1842
Reliability: 99.7%
Jobs completed: 18,293
Verification failures: 11
Average latency: 42 ms
```

Reputation must be revocable and must not become an irreversible social score attached to a student.

---

## 16. Byzantine and Malicious Nodes

The network must be designed for adversarial conditions.

Possible threats include:

- false AI results;
- poisoned model updates;
- malicious educational content;
- fake capability advertisements;
- resource flooding;
- Sybil nodes;
- replay attacks;
- data exfiltration attempts;
- denial-of-service behavior;
- colluding nodes.

Mitigations should include:

- authenticated workloads;
- signed resources;
- sandboxed execution;
- result verification;
- redundant execution for high-value jobs;
- rate limiting;
- node reputation;
- revocation;
- anomaly detection;
- quorum/consensus approaches where justified.

Not every task needs redundant execution. Verification should be proportional to risk and cost.

---

## 17. Sandboxed Peer Compute

Peer devices must never receive arbitrary executable code from another student.

The node protocol should define constrained workload types such as:

- approved model inference;
- approved transformation jobs;
- content hashing;
- indexing;
- validation;
- bounded data-processing tasks.

Execution should occur inside a sandbox appropriate to the platform.

The peer should receive a workload specification, not arbitrary code execution privileges.

---

## 18. P2P Transport

WebRTC DataChannel is a strong browser-native candidate for direct peer exchange where practical.

A lightweight control/signaling service can help peers establish connections without becoming the mandatory payload path.

```text
                 Shadecode control plane
                  / discovery / signaling
                           |
                    connection setup
                           |
             +-------------+-------------+
             |                           |
         Device A                   Device B
             |                           |
             +------ encrypted P2P ------+
                    data / content
```

Direct connectivity will not always be possible. Relay infrastructure may therefore be required.

The architectural goal is **peer-preferred**, not the unrealistic promise of universal server-free connectivity.

---

## 19. Control Plane vs Data Plane

Shadecode should separate coordination from payload delivery.

### Control plane

Can remain centralized or semi-centralized:

- authentication;
- device registration;
- discovery metadata;
- signaling;
- model manifests;
- resource indexes;
- policy distribution;
- trust and reputation metadata;
- moderation;
- subscription/account state;
- cloud fallback coordination.

### Data plane

Should become increasingly distributed:

- educational resources;
- cached AI outputs;
- peer inference jobs;
- local synchronization;
- model artifacts where licensed;
- public content.

This is the key architectural shift from conventional client-server design.

---

## 20. School and Community Intelligence Nodes

A school, university, polytechnic, library, or community could operate a local Shadecode node.

The node could cache:

- curriculum material;
- syllabus-aligned resources;
- past papers;
- permitted mark schemes;
- teacher resources;
- generated lessons;
- question banks;
- public educational media;
- local models.

Students could connect locally and synchronize when internet connectivity is poor.

This is especially important for Zimbabwe and other environments where mobile data cost and intermittent connectivity materially affect access to educational technology.

---

## 21. Local-Network Intelligence

The system should exploit proximity.

```text
                 INTERNET
                    |
             +--------------+
             | School node  |
             | cache + AI   |
             +------+-------+
                    |
             local network / P2P
              /       |       \
           phone    laptop    tablet
```

A school network could therefore become a small educational intelligence cluster.

The same architecture can later apply to:

- universities;
- polytechnics;
- libraries;
- homes;
- community learning centers;
- regional Shadecode nodes.

---

## 22. Offline-First Intelligence

Distributed intelligence must strengthen, not weaken, offline learning.

A student should be able to:

1. obtain resources while connected;
2. download models or intelligence packs where supported;
3. study offline;
4. run local AI where possible;
5. exchange permitted resources locally;
6. queue synchronization operations;
7. reconnect later and synchronize.

Connectivity should improve the experience, not determine whether the core learning system functions.

---

## 23. Resource Replication Policy

Replication should be selective.

Factors:

- popularity;
- syllabus relevance;
- local demand;
- storage capacity;
- battery state;
- network type;
- bandwidth limits;
- sharing policy;
- freshness;
- trust;
- licensing constraints.

Default protections should include:

- Wi-Fi preferred;
- charging preferred for large transfers;
- configurable storage quota;
- metered-network protection;
- explicit sharing controls;
- stale-resource expiry;
- bandwidth limits.

---

## 24. Legal and Educational Integrity Boundary

A distributed network must not become an uncontrolled redistribution mechanism.

Replication must respect:

- copyright;
- publisher permissions;
- school permissions;
- creator licenses;
- takedown requirements;
- regional legal requirements.

The architecture should support explicitly distributable resources and provide:

- provenance;
- publisher identity;
- verification state;
- removal/revocation;
- content reporting;
- moderation.

Popularity must never be treated as proof of academic authority.

---

## 25. Resource Provenance

Shareable resources should eventually carry metadata such as:

```text
content_id
resource_type
subject
qualification
syllabus
version
source
author_or_publisher
created_at
signature
verification_status
trust_level
usage_count
```

Suggested trust levels:

1. Official/verified
2. Teacher-created/verified
3. Community-created
4. AI-generated
5. Unverified

The interface should make this distinction visible.

---

## 26. Distributed AI Generation Cache

Cortex should check whether a useful answer or lesson already exists before invoking an expensive generation request.

```text
AI request
   |
   v
semantic similarity / resource lookup
   |
  found?
 /     \
yes      no
 |        |
reuse    route intelligence
          |
    local -> peer -> edge -> cloud
```

Personalization is the boundary. A shared lesson can satisfy the common instructional portion while private Cortex context is applied locally.

This reduces repeated generation without flattening personalization.

---

## 27. Network-Aware AI Economics

Cortex should eventually expose an internal cost model, even if users never see monetary values.

Possible internal scoring:

```text
execution_score =
    privacy_weight
  + latency_weight
  + accuracy_weight
  + availability_weight
  + trust_weight
  - cloud_cost_weight
  - energy_cost_weight
  - bandwidth_cost_weight
```

The exact algorithm should evolve through measurement rather than being hard-coded prematurely.

The important architectural principle is that **cloud inference is a resource to optimize, not the default assumption**.

---

## 28. What Remains Centralized

Some responsibilities should remain centralized or strongly coordinated.

These include:

- account authentication;
- global abuse controls;
- emergency revocation;
- policy distribution;
- model/version manifests;
- legal takedown coordination;
- authoritative curriculum metadata where applicable;
- billing/subscriptions;
- security updates;
- cloud fallback;
- ecosystem governance.

Decentralization should be selective and purposeful.

---

## 29. Relationship to ShadeNet

ShadeNet is the network substrate for distributed educational content and peer exchange.

Distributed Intelligence is the intelligence layer that uses that substrate.

```text
+------------------------------------------------------+
| Shadecode Student                                   |
+------------------------------------------------------+
| Cortex Intelligence                                 |
| personal | adaptive | assessment | reasoning        |
+------------------------------------------------------+
| Distributed Intelligence Router                     |
| local | personal peer | ShadeNet | edge | cloud    |
+------------------------------------------------------+
| ShadeNet                                             |
| discovery | trust | replication | P2P | resources  |
+------------------------------------------------------+
| Local-First Data Plane                              |
| IndexedDB | operation log | local cache            |
+------------------------------------------------------+
| Cloud Control Plane                                 |
| auth | signaling | indexes | backup | AI fallback |
+------------------------------------------------------+
```

ShadeNet moves resources and enables peers. Distributed Intelligence decides **where intelligence should execute**.

---

## 30. Relationship to Existing Cortex

The current autonomous Cortex Engine is primarily a development automation system. It reads repository/database signals, consults an AI provider, applies proposed code changes, updates a devlog, and opens a pull request. The current implementation is therefore not the distributed runtime intelligence layer described here.

The strategic architecture should keep these systems distinct:

```text
Cortex Runtime
    |
    +-- student intelligence
    +-- local/peer/edge/cloud routing
    +-- learning adaptation

Cortex Development Agent
    |
    +-- repository analysis
    +-- improvement planning
    +-- PR generation
    +-- development automation
```

Future work may allow the development agent to use distributed telemetry or test infrastructure, but it should not gain unrestricted access to user devices.

---

## 31. Architectural Principles

1. **Local first.** Execute privately and cheaply when the device can do the job.
2. **Peer first where appropriate.** Use trusted nearby resources before expensive cloud execution.
3. **Cloud when necessary.** Cloud remains an important capability, not a failure state.
4. **Privacy by default.** Private student context remains private.
5. **Explicit contribution.** Users control whether their devices contribute compute, storage, or bandwidth.
6. **Zero trust.** Every peer is potentially faulty or malicious.
7. **Verify important work.** High-risk or high-value outputs may require redundant verification.
8. **Content before generation.** Reuse valid existing resources before generating duplicates.
9. **Separate control and data planes.** Central coordination does not require central payload delivery.
10. **Offline is a first-class state.** The system must degrade gracefully without internet access.
11. **Heterogeneity is normal.** A phone, laptop, school node, and cloud GPU have different capabilities.
12. **Measure before optimizing.** Routing decisions should eventually be evidence-driven.
13. **Decentralize selectively.** Keep governance, security, identity, and critical coordination reliable.
14. **Never make decentralization an excuse for weak safety.** Security and educational integrity remain mandatory.

---

## 32. Implementation Roadmap

### Phase A: Local intelligence foundation

- stable local-first data layer;
- local content index;
- model capability detection;
- local inference interface;
- offline AI cache;
- private Cortex memory boundary.

### Phase B: Content addressing

- canonical resource format;
- SHA-256 content IDs;
- content-addressed local cache;
- duplicate detection;
- resource provenance metadata.

### Phase C: Personal device federation

- authenticated device pairing;
- encrypted personal synchronization;
- local resource transfer;
- device capability advertisement;
- personal-node routing.

### Phase D: ShadeNet discovery

- peer discovery;
- capability announcements;
- resource availability announcements;
- authenticated peer sessions;
- network policy controls.

### Phase E: P2P content transport

- WebRTC DataChannel where practical;
- encrypted transfer;
- chunking/resume;
- integrity verification;
- relay fallback;
- bandwidth/battery policies.

### Phase F: Peer compute

- bounded approved workload types;
- sandboxed execution;
- job authentication;
- result verification;
- node reputation;
- resource accounting.

### Phase G: Edge intelligence

- school/community nodes;
- local model registry;
- local educational cache;
- regional/offline synchronization.

### Phase H: Federated learning

- privacy-preserving updates;
- secure aggregation;
- differential privacy where appropriate;
- robust aggregation;
- poisoning detection.

### Phase I: Advanced distributed inference

Only after measurement proves that it is worthwhile:

- model partitioning;
- distributed inference;
- multi-node scheduling;
- heterogeneous accelerator coordination.

---

## 33. Immediate Engineering Priorities

Do not rewrite Shadecode Student around this architecture in one pass.

The immediate sequence should be:

1. preserve and strengthen the existing local-first architecture;
2. migrate application domains such as Tasks and Subjects to local-first storage where appropriate;
3. establish a stable content-addressed resource layer;
4. define node identity and capability schemas;
5. define the ShadeNet resource protocol;
6. prototype authenticated peer discovery;
7. implement small, safe P2P content transfers;
8. add Cortex resource retrieval through local and peer caches;
9. prototype bounded peer inference on controlled devices;
10. measure cost, latency, reliability, privacy, and energy before expanding.

The architecture should evolve through working prototypes rather than a speculative rewrite.

---

## 34. Success Metrics

The distributed architecture should be evaluated with measurable outcomes.

### Cost

- reduction in external AI calls;
- reduction in cloud inference spend;
- reduction in repeated content generation;
- bandwidth saved through peer distribution.

### Performance

- median response latency;
- offline task completion rate;
- peer retrieval latency;
- cloud fallback rate.

### Reliability

- successful peer connection rate;
- resource integrity failure rate;
- job completion rate;
- network recovery time.

### Privacy

- percentage of requests resolved without private context leaving device;
- private-data exposure incidents;
- successful policy enforcement rate.

### Network utility

- replicated resources;
- cache hit rate;
- active participating nodes;
- useful compute-hours contributed;
- resource availability across disconnected periods.

### Educational outcomes

The network should ultimately be judged by learning outcomes, not by distributed-computing statistics alone.

---

## 35. Strategic Outcome

The long-term Shadecode architecture becomes more than an application calling AI APIs.

It becomes a **distributed educational intelligence system** in which:

- the student's device is an intelligence node;
- personal devices can cooperate;
- users can optionally contribute spare compute;
- educational knowledge can propagate through peers;
- schools and communities can operate local intelligence nodes;
- Cortex orchestrates the intelligence layers;
- cloud providers remain optional heavyweight resources;
- private student context remains protected;
- the network becomes cheaper and more resilient as participation grows.

The desired evolution is:

```text
Today

Student -> Shadecode -> AI provider

                |
                v

Future

             +----------------+
             |     Cortex     |
             +-------+--------+
                     |
        +------------+-------------+
        |            |             |
      Local        ShadeNet      Edge
        |            |             |
        +------------+-------------+
                     |
               Cloud fallback
```

And at mature scale:

```text
             ┌─────────────────────────┐
             │   SHADECODE INTELLIGENCE│
             │         NETWORK         │
             └────────────┬────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
   Student A          Student B          Student C
       │                  │                  │
   local AI           local AI           local AI
       │                  │                  │
       └─────────────── ShadeNet ─────────────┘
                          │
                  school / edge nodes
                          │
                    cloud fallback
```

> **Shadecode Student is the learning application. ShadeNet is the educational network. Cortex is the intelligence orchestrator. Together they form the foundation for Shadecode's distributed intelligence system.**

---

## 36. Decision Record

This architecture establishes the following strategic decisions:

- Shadecode will pursue a **local + peer + edge + cloud** intelligence model.
- External AI providers remain optional infrastructure rather than the definition of Shadecode intelligence.
- Device compute contribution will be opt-in and policy-controlled.
- Private student context will remain separated from shareable network resources.
- ShadeNet and Distributed Intelligence are related but distinct layers.
- The first distributed capabilities should focus on content distribution and bounded workloads, not giant distributed LLMs.
- Security, provenance, trust, and verification are core architecture rather than later polish.
- The architecture must remain compatible with low-bandwidth, intermittent-connectivity environments.
- The implementation will proceed incrementally from the existing local-first foundation.
