# ShadeNet: Decentralized Education Network

## Status

Proposed architecture and implementation direction for Shadecode Student.

This document extends the local-first architecture. The device remains the primary data plane, while ShadeNet adds an optional peer-to-peer educational content layer across different users' devices.

## 1. Vision

ShadeNet is a decentralized educational knowledge network in which Shadecode Student devices can act as:

- learners and consumers of educational content;
- local caches of useful resources;
- publishers of explicitly shareable resources;
- peers that transfer resources directly to other peers;
- optional local intelligence nodes for Cortex;
- offline synchronization points for other devices.

The long-term principle is:

> Local first. Peer first. Cloud when necessary.

The goal is not to eliminate servers completely. The goal is to stop treating a central server as the mandatory highway for ordinary educational data and content.

## 2. Relationship to the Local-First Architecture

ShadeNet builds on the local-first foundation already introduced in Shadecode Student.

### Device

The device is the primary store for personal state:

- tasks;
- subjects;
- XP and progression;
- streaks;
- achievements;
- timetable and study plans;
- notes;
- Cortex memory;
- downloaded lessons;
- downloaded educational media;
- revision state;
- exam progress;
- settings.

### Cloud

Supabase should increasingly become a control-plane and recovery service rather than the default data plane:

- authentication;
- signaling/discovery metadata;
- encrypted personal backup;
- public/community content indexes;
- moderation and trust infrastructure;
- school-wide or globally authoritative data;
- subscription and account state;
- cloud AI fallback.

### Peer network

ShadeNet supplies the missing middle layer:

- peer discovery;
- direct resource transfer;
- resource replication;
- local-network distribution;
- cross-device synchronization where appropriate;
- distributed caching of educational resources.

## 3. Content Flow

A ShadeNet request should prefer the cheapest and most local source first:

```text
REQUEST RESOURCE
      |
      v
Local cache?
   |       |
  YES      NO
   |       v
 DONE   Nearby peer?
          |      |
         YES     NO
          |      v
         P2P   Known remote peer?
                 |       |
                YES      NO
                 |       v
                P2P    Cloud/CDN/index?
                           |       |
                          YES      NO
                           |       v
                        download  generate/fetch
                           |       |
                           +-------+
                               |
                         cache + optionally publish
```

This is the core behavioral difference from a conventional client-server application.

## 4. Content-Addressed Resources

Educational resources should eventually be identified by a cryptographic content hash rather than only by database IDs.

Example conceptual identity:

```text
content_hash = SHA-256(canonical_resource_bytes)
```

The hash becomes the stable identity of the exact content/version.

Benefits:

- duplicate detection;
- content integrity verification;
- efficient caching;
- deduplication;
- safe peer transfer;
- reproducible references;
- easier replication.

If thousands of students possess the exact same lesson, ShadeNet should treat it as one content object with many replicas rather than thousands of unrelated downloads.

## 5. Distributed Educational Cache

ShadeNet should behave like an educational content swarm.

Popular resources naturally acquire more replicas as students download them. A resource may exist simultaneously on many student devices, school nodes, and optional cloud storage.

Examples:

- past papers;
- mark schemes where legally distributable;
- generated lessons;
- flashcard decks;
- question sets;
- educational videos where licensing permits redistribution;
- teacher-created material;
- syllabus-aligned study packs;
- public/community resources.

The network should not assume that every device stores everything. Replication should be selective and constrained by storage, bandwidth, battery, privacy, popularity, and user settings.

## 6. Generated Content Sharing

A major intended use case is avoiding repeated AI generation.

If one student asks for a high-quality lesson and publishes it as shareable content, another student requesting substantially the same resource can retrieve the existing resource before invoking a cloud model.

Conceptual flow:

```text
Student A asks for lesson
        |
        v
Check local/peer network
        |
   resource exists?
      /       \
    yes        no
     |          |
    P2P       cloud AI
     |          |
     |       generate
     |          |
     +----> publish/cache
```

This can reduce:

- repeated model calls;
- AI API costs;
- latency;
- bandwidth consumption;
- duplicated educational material.

Cloud AI becomes the fallback generator when useful content is unavailable or when personalization genuinely requires a new generation.

## 7. Personalization Boundary

A shared resource must not automatically expose private student data.

### Private by default

- Cortex memories;
- personal AI conversations;
- study history;
- private notes;
- personal timetable;
- personal weaknesses and analytics;
- account information;
- private learning plans.

### Explicitly shareable

- generated lessons;
- public question sets;
- flashcard decks;
- teacher resources;
- permitted educational videos;
- public study packs;
- community resources.

Publishing must be an explicit user action or a clearly configured opt-in policy.

## 8. Provenance and Trust

A decentralized educational network requires stronger provenance than a conventional private database.

Every shareable resource should eventually carry metadata such as:

```text
content_hash
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
rating_summary
usage_count
```

Suggested trust categories:

1. Official/verified
2. Teacher-created/verified
3. Community-created
4. AI-generated
5. Unverified

The UI must make trust level visible.

ShadeNet should never imply that a resource is academically authoritative merely because it is popular.

## 9. P2P Transport

The preferred browser-native transport is WebRTC DataChannel for direct peer-to-peer exchange where practical.

A lightweight signaling service can help peers establish connections without carrying the educational payload itself.

Conceptually:

```text
                 Shadecode signaling/index
                         |
                  connection setup
                         |
            +------------+------------+
            |                         |
        Device A                 Device B
            |                         |
            +------ encrypted P2P ---+
                    content/data
```

The architecture must account for networks where direct peer connectivity fails. A relay/TURN path may be required in some environments. ShadeNet therefore remains peer-preferred rather than promising universal server-free connectivity.

## 10. Nearby-First Distribution

ShadeNet should exploit local connectivity whenever possible.

A school, library, home, or community network could have devices exchanging resources directly without every device independently downloading the same material from the internet.

Potential topology:

```text
                 INTERNET
                    |
             +--------------+
             | ShadeNet Node |
             | optional cache |
             +------+-------+
                    |
          local network / P2P
          /        |        \
       phone    laptop     tablet
```

This is especially relevant to environments where mobile data is expensive, intermittent, or unreliable.

## 11. School ShadeNet Nodes

A future optional product could be a small ShadeNet node for a school or community.

It could cache:

- syllabus-aligned learning packs;
- past papers;
- permitted educational videos;
- teacher material;
- generated lessons;
- question banks;
- public resources.

Students could synchronize against the local node and then exchange content between their own devices.

The node could require internet only periodically to update its cache and metadata.

## 12. Cross-User Knowledge Exchange

ShadeNet is intentionally different from personal device synchronization.

### Device synchronization

Synchronizes one student's own state:

```text
Phone A <-> Laptop A
```

### ShadeNet content exchange

Shares explicitly published educational resources between different users:

```text
Student A <-> Student B <-> Student C
```

These two systems must remain separate in the implementation and security model.

## 13. Cortex Integration

Cortex should eventually search knowledge in this order:

1. personal local memory;
2. locally cached lessons/resources;
3. local device index;
4. nearby ShadeNet peers;
5. wider peer resources;
6. cloud-indexed resources;
7. cloud AI generation.

This turns Cortex into a layered intelligence system rather than a simple cloud API wrapper.

Example:

```text
Student asks:
"Teach me electromagnetic induction."

Cortex
  |
  +-- personal memory
  +-- local lessons
  +-- local papers
  +-- nearby peers
  +-- ShadeNet network
  +-- cloud knowledge
  +-- AI generation if required
```

Cortex may then combine retrieved resources with personalized local context without uploading the student's private context merely to locate public educational material.

## 14. Resource Replication Strategy

Replication should be intelligent rather than indiscriminate.

Potential factors:

- resource popularity;
- syllabus relevance;
- local demand;
- available disk space;
- battery state;
- network type;
- bandwidth limits;
- user's sharing preference;
- resource freshness;
- trust level;
- legal/licensing constraints.

A device should never silently consume large amounts of mobile data or battery to act as a peer.

Suggested policies:

- Wi-Fi only by default for seeding;
- charging preferred for large transfers;
- configurable storage quota;
- user-controlled participation;
- metered-network protection;
- automatic expiry for stale cache entries.

## 15. Security Model

The system must distinguish between content integrity, user privacy, and network trust.

### Integrity

Content hashes detect tampering or corruption.

### Privacy

Private user data remains local and/or encrypted in personal backup.

### Transport security

P2P connections should use secure browser-supported transport.

### Identity

Devices need stable local identities, while user identity and device pairing must be authenticated.

### Authorization

Publishing, private sharing, school sharing, and public sharing require different permission scopes.

### Abuse resistance

The network needs rate limits, reputation, reporting, revocation, and potentially signed publisher identities.

## 16. Legal and Content Safety Boundary

ShadeNet must not become a mechanism for indiscriminate redistribution of copyrighted material.

Content replication rules must respect:

- copyright;
- publisher permissions;
- school permissions;
- creator licenses;
- takedown requirements;
- regional legal requirements.

The architecture should support resources that are explicitly distributable, while providing mechanisms for removal and revocation of resources that should no longer be available.

## 17. Offline and Intermittent-Internet Operation

ShadeNet should be designed for intermittent connectivity rather than assuming continuous internet access.

A student should be able to:

1. download a learning pack while online;
2. study completely offline;
3. share permitted content locally;
4. synchronize personal progress later;
5. receive updated content when connectivity returns.

The system should queue operations and content announcements rather than failing when disconnected.

## 18. Economic Impact

The architecture can reduce infrastructure costs by changing the traffic pattern.

Instead of:

```text
N students -> cloud -> N downloads
```

ShadeNet can move toward:

```text
cloud -> initial replicas -> peer distribution
```

Likewise, instead of:

```text
N students -> N AI generations
```

it can become:

```text
1 useful generation -> cached/shared resource -> many consumers
```

This does not make infrastructure free. It changes where bandwidth, storage, and computation happen and allows the network to use resources already present on participating devices.

## 19. Long-Term Architecture

The intended Shadecode stack becomes:

```text
+--------------------------------------------------+
|                Shadecode Student                 |
+--------------------------------------------------+
| UI / Learning Experience                         |
+--------------------------------------------------+
| Cortex                                           |
| local intelligence + cloud augmentation          |
+--------------------------------------------------+
| ShadeNet                                          |
| discovery | trust | replication | P2P transport |
+--------------------------------------------------+
| Local-First Data Plane                            |
| IndexedDB | operation log | local cache          |
+--------------------------------------------------+
| Optional Cloud Control Plane                     |
| Auth | signaling | indexes | backup | AI fallback|
+--------------------------------------------------+
```

## 20. Implementation Phases

### Phase 1: Foundation

Already introduced:

- local-first store;
- device identity;
- operation log foundation;
- encrypted sync bundles;
- `.scsync` import/export;
- encrypted cloud backup.

### Phase 2: Migrate application domains

- Tasks/Subjects local-first;
- XP event ledger;
- streaks and achievements local-first;
- timetable/study plans local-first;
- Cortex memory local-first;
- local content index.

### Phase 3: Content addressing

- canonical resource representation;
- SHA-256 content IDs;
- local content-addressed cache;
- metadata/index schema;
- duplicate detection.

### Phase 4: ShadeNet discovery

- peer capability advertisement;
- resource availability announcements;
- nearby peer discovery;
- authenticated device pairing;
- network policy controls.

### Phase 5: P2P transfer

- WebRTC DataChannel transport;
- encrypted resource exchange;
- resumable/chunked transfer;
- integrity verification;
- bandwidth and battery policies.

### Phase 6: Distributed replication

- popularity-aware replication;
- cache quotas;
- school/local nodes;
- peer selection;
- resource lifecycle/expiry.

### Phase 7: Cortex + ShadeNet

- peer-aware retrieval;
- local semantic/resource index;
- personalized retrieval without exposing private memory;
- AI generation as fallback;
- publish useful generated resources with explicit consent.

### Phase 8: Trust and ecosystem

- signed resources;
- publisher identities;
- verification workflows;
- ratings/reputation;
- moderation;
- revocation/takedown mechanisms.

## 21. Design Principle

ShadeNet should not be built because decentralization is fashionable.

It should be built because it gives Shadecode Student concrete advantages:

- lower cloud costs;
- lower repeated AI-generation costs;
- less dependence on a single backend;
- better offline capability;
- better performance;
- reduced bandwidth requirements;
- useful local-network distribution;
- resilient content availability;
- new cross-user educational collaboration possibilities.

The final goal is a learning system where useful knowledge can move through the student population without every request having to pass through a central server.

> **Shadecode Student is the application. ShadeNet is the educational network underneath it.**

## 22. Immediate Next Step

Do not attempt a full rewrite.

The next implementation target is to continue from the existing local-first foundation by migrating **Tasks and Subjects** to the local store, then introduce a **content-addressed resource layer**. After that, build peer discovery and P2P transfer on top of stable content identities.

This keeps the project incremental and testable while moving toward the larger decentralized education architecture.