# Shadecode Master Roadmap & Progress Matrix

**Date:** 2026-09-01  
**Status:** Authoritative strategic/engineering tracker  
**Scope:** All Shadecode capabilities discussed in the September 1 product-design work, reconciled against known repository and production foundations.

> This document is the master scope. The three education experiences are only one workstream. Shadecode is being built as a local-first learning operating system with shared intelligence, learning, assessment, creation, people, knowledge, safety and platform foundations.

## 1. North Star

Shadecode should help a learner continuously move through:

**Learn → Practice → Make mistakes → Understand why → Adapt → Re-test → Master → Remember**

The system should improve the learner's next action from real evidence, work offline wherever practical, and preserve useful learning state over time.

## 2. Status legend

- 🟢 **SHIPPED** — working foundation/capability exists in the product or production infrastructure.
- 🟡 **PARTIAL** — meaningful implementation exists but the capability is incomplete, inconsistent or needs hardening.
- 🔵 **FOUNDATION** — architecture/data/UI groundwork exists; full user capability is not complete.
- 🟣 **IN DEVELOPMENT** — actively being implemented in the current execution sequence.
- ⚪ **PLANNED** — agreed product direction without sufficient implementation yet.
- 🔴 **REWORK / BLOCKED** — existing implementation needs correction before expansion.
- 🔬 **RESEARCH** — technically or commercially exploratory; not a current delivery dependency.

Status is deliberately conservative. A concept is not marked shipped merely because a screen, API or prototype exists.

---

# 3. Master Progress Matrix

## A. Cortex / Intelligence

| Capability | Status | Current truth / next move |
|---|---|---|
| Cortex intelligence layer | 🟡 | Existing production surface; unify evidence, state and recommendations. |
| Canonical learning events | 🟢 | Canonical ingress and durable `cortex_events` foundation exist. |
| Event idempotency | 🟢 | Canonical event identity is enforced by durable storage. |
| Learning observation adapter | 🟢 | Canonical events can be translated into Cortex observations. |
| Topic mastery | 🟢/🟡 | Existing `topic_mastery` is authoritative; semantics need reconciliation with local learning state. |
| Retention | 🔵 | Persistent state field/foundation exists; full forgetting model is not finished. |
| Confidence | 🔵 | Persistent state foundation exists; calibration model remains. |
| Stability | 🔵 | Persistent field exists; learning semantics need validation. |
| Exposure | 🔵 | Persistent evidence foundation exists. |
| Error rate | 🔵 | Persistent field exists; richer mistake taxonomy remains. |
| Response speed | 🔵 | Persistent field exists; reliable measurement/interpretation remains. |
| Prerequisite health | 🔵 | Field exists; graph/causal prerequisite engine remains. |
| Recent improvement | 🔵 | Field exists; longitudinal semantics remain. |
| Uncertainty | 🔵 | Field exists; confidence/uncertainty policy remains. |
| Learner Learning DNA | ⚪ | Planned unified learner model. |
| Knowledge graph | 🔵 | Direction and data relationships defined; broad implementation remains. |
| Concept prerequisites | 🔵 | Architecture direction exists; graph-backed inference remains. |
| Weak-area detection | 🟡 | Existing Cortex/analytics signals; needs canonical evidence integration. |
| Mistake intelligence | 🟡 | Existing analysis foundations; taxonomy and longitudinal patterns remain. |
| Forgetting radar | ⚪ | Planned. |
| Adaptive intervention engine | ⚪ | Planned after evidence/mastery semantics are stable. |
| Next-best-action engine | 🔵 | Recommendation foundations exist; needs stronger evidence loop. |
| Recommendation engine | 🟡 | Existing recommendations; needs unified Cortex decision model. |
| Reflection engine | ⚪ | Planned. |
| Learning Replay | ⚪ | Planned. |
| Longitudinal learning | 🔵 | Data foundation exists; cross-time intelligence remains. |
| Tutor role | 🟡 | Existing Cortex/tutor capability. |
| Socratic role | ⚪ | Planned. |
| Examiner role | 🟡 | Exam/marking foundations exist. |
| Coach/planner role | 🟡 | Timetable/task foundations exist. |
| Analyst role | 🟡 | Analytics foundations exist. |
| Creator/project mentor | 🟡 | Project Studio foundation exists. |
| Career intelligence | 🟡 | Careers surface exists; evidence-based recommendations remain. |
| Multi-agent Cortex architecture | 🔬 | Research only until real role separation justifies it. |
| Model routing | 🟡 | Provider routing exists; local/cloud policy needs expansion. |
| Local specialized models | 🔬 | Research. |
| Quantization/distillation/pruning | 🔬 | Research technique, not a product milestone. |
| AI provenance/safety | 🟡 | Principles and foundations exist; expand across generated content. |

## B. Learning OS

| Capability | Status | Current truth / next move |
|---|---|---|
| Learn | 🟢/🟡 | Existing major surface; needs deeper evidence integration. |
| Curriculum-aware learning | 🟡 | Existing curriculum workflows; broader coverage required. |
| Deep lessons | 🟡 | Existing learning foundation; improve coverage and structure. |
| Personalized explanations | 🟡 | AI capability exists; tie to learner state. |
| Multiple solution paths | ⚪ | Planned structured learning capability. |
| Show Your Work | 🟡 | Math/learning direction exists; expand reasoning evidence. |
| Question mutation | ⚪ | Planned. |
| Adaptive difficulty | 🟡 | Partial assessment/learning foundations. |
| Micro-learning | ⚪ | Planned. |
| Flashcards | 🟡 | Existing/partial revision capability; auto-generation from evidence remains. |
| Revision packs | 🟡 | Foundations exist; make adaptive and offline-pack aware. |
| Personalized revision | 🟡 | Timetable/recommendation foundations; strengthen Cortex loop. |
| Oral learning | ⚪ | Planned. |
| Explain-it-like-X | ⚪ | Planned interaction control. |
| Curiosity / Why mode | ⚪ | Planned. |
| Real-world learning | ⚪ | Planned. |
| Cross-subject connections | ⚪ | Depends on knowledge graph. |
| Personal Textbook | ⚪ | Planned. |
| Formula Book | 🟡 | Direction tied to math learning; unify into learner-owned artifact. |
| Concept Atlas | ⚪ | Planned. |
| Mistake Museum | ⚪ | Planned. |
| Local knowledge packs | 🔵 | Architecture direction exists; packaging pipeline remains. |
| Multilingual/local-language learning | ⚪ | Planned, Zimbabwe-first. |

## C. Assessment / Exam Intelligence

| Capability | Status | Current truth / next move |
|---|---|---|
| Exam Simulation | 🟡/🔴 | Existing surface but previously unreliable; stabilize before expansion. |
| Real past-paper mode | 🟡 | Exam Hub/past-paper foundations exist. |
| Paper ingestion | 🟡 | Bulk ingestion work exists; mapping/coverage remains. |
| Question extraction | 🔵 | Ingestion direction exists; mature structured question database needed. |
| Question provenance | 🔵 | Required architecture; expand consistently. |
| Syllabus/topic mapping | 🟡 | Known gap from ingestion work. |
| Mark schemes | 🟡 | Resource pipeline foundation; coverage remains. |
| Examiner reports | ⚪ | Authorized-source integration planned. |
| Paper Intelligence | 🔵 | Strategic architecture defined; implementation remains. |
| Question Forge | ⚪ | Planned shared generation engine. |
| Question similarity | ⚪ | Planned. |
| Topic frequency analysis | ⚪ | Planned. |
| Paper Replica | ⚪ | Planned. |
| Weakness Paper | ⚪ | Planned. |
| Quick Fire | ⚪ | Planned. |
| Boss/Nightmare mode | ⚪ | Planned. |
| Recovery assessments | ⚪ | Planned misconception-repair loop. |
| Post-exam intervention | 🟡 | Recommendation foundations exist; make evidence-driven. |
| Assessment analytics | 🟡 | Existing analytics; unify with Cortex state. |
| Cambridge support | 🟢/🟡 | Core target and existing support; coverage needs continual expansion. |
| ZIMSEC support | 🟢/🟡 | Core target and existing support; coverage needs continual expansion. |
| University/TVET assessment | 🔵 | Direction/foundations only. |

## D. Math / Science / Practical Intelligence

| Capability | Status | Current truth / next move |
|---|---|---|
| Math Checker | 🟢/🟡 | Existing surface; evolve from answer checking toward working analysis. |
| Handwriting recognition | 🔵 | Existing image/math direction; robust reasoning extraction remains. |
| Step-by-step working analysis | 🔵 | Direction exists; deeper structured evidence needed. |
| Graph intelligence | ⚪ | Planned. |
| Physics-aware tutoring | 🟡 | Existing AI/curriculum capabilities; formal subject intelligence remains. |
| Chemistry-aware tutoring | 🟡 | Partial generic/curriculum capability; formal subject intelligence remains. |
| Biology-aware tutoring | 🟡 | Partial generic/curriculum capability; formal subject intelligence remains. |
| Practical simulator | ⚪ | Planned. |
| Measurement/uncertainty lab | ⚪ | Planned. |
| Camera / Snap & Learn | 🔵 | Product direction defined; broader multimodal workflow remains. |
| Diagram understanding | ⚪ | Planned. |

## E. Creation / Projects / Research

| Capability | Status | Current truth / next move |
|---|---|---|
| Project Studio | 🟢/🟡 | Existing production surface with evidence/integrity foundations. |
| Project planning | 🟡 | Existing staged workflow. |
| Research mode | 🔵 | Direction/foundations. |
| Research Vault | 🔵 | Direction/foundations. |
| Evidence collection | 🟡 | Project evidence capture exists. |
| Provenance/integrity | 🟡 | Existing project integrity work; expand across research. |
| Portfolio | 🔵 | Direction exists; learner-owned portfolio needs implementation. |
| Presentations | 🔵 | Direction exists. |
| Reflection | ⚪ | Planned. |
| STEM challenges | ⚪ | Planned. |
| Science challenges | ⚪ | Planned. |
| Data Lab | ⚪ | Planned. |
| Creative mode | ⚪ | Planned. |
| Visual programming | ⚪ | Planned. |
| Coding Lab | 🟡 | Project/coding foundations exist; dedicated lab remains. |
| Algorithm visualisation | ⚪ | Planned. |
| Robotics | 🔬 | Future research/creation track. |
| Cortex Game Factory | 🔬 | Future creation/research track. |

## F. Engagement / Gamification

| Capability | Status | Current truth / next move |
|---|---|---|
| XP | 🟡 | Existing but centralization/hardening needed. |
| Levels | 🟡 | Existing foundation. |
| Achievements | 🟡 | Existing but event handler/completeness gaps remain. |
| Streaks | 🟢/🟡 | Existing. |
| Daily Challenges | 🟢/🟡 | Existing. |
| Leaderboards | 🟢 | Existing. |
| Missions | 🔵 | Product direction; deepen into meaningful learning missions. |
| Collections | 🔵 | Direction. |
| Learning worlds | ⚪ | Planned. |
| Gamified mastery | 🟡 | Existing gamification; connect to actual mastery evidence. |
| Weekly leagues | ⚪ | Planned. |
| Friend battles | ⚪ | Planned with safety controls. |
| Controlled class challenges | ⚪ | Planned. |
| Primary-safe rewards | 🔵 | Primary design requirement. |

## G. Education Experiences

| Experience | Status | Scope |
|---|---|---|
| Shadecode Student | 🟢 | Current production experience for Secondary/Cambridge/ZIMSEC. |
| Shadecode Discovery | 🔵 | Primary experience foundation and first-activity contract defined. |
| Shadecode Campus | 🔵 | University/college/polytechnic/TVET foundation direction. |
| Primary → Secondary continuity | ⚪ | Requires shared learner state and curriculum mapping. |
| Secondary → tertiary continuity | 🔵 | Data architecture direction defined. |

### Primary Discovery scope

Primary is its own experience, not Student with larger buttons. Planned/defined areas include reading adventures, phonics, handwriting, mental maths, maths worlds, stories, puzzles, science exploration, drawing-to-understand, listen/respond, curiosity, world explorer, local-language learning, career dreams, child-safe Cortex, parent/teacher companion and transition support.

### Student scope

Secondary learning, Cambridge/ZIMSEC, subject mastery, revision, past papers, Exam Simulation, assignments, projects, study planning, Cortex, analytics, careers and university preparation.

### Campus scope

University, college, polytechnic and TVET structures, programmes, modules, terms/semesters, coursework, assignments, research, projects, portfolios, labs, skills, internships, scholarships and careers.

## H. Teacher / School / Parent

| Capability | Status | Current truth / next move |
|---|---|---|
| Teacher intelligence | ⚪ | Planned. |
| Marking assistant | 🔵 | Direction; high-stakes safeguards required. |
| Intervention recommendations | 🔵 | Cortex dependency. |
| Classroom knowledge map | ⚪ | Planned. |
| Student progress intelligence | 🔵 | Analytics foundations; classroom aggregation remains. |
| Teacher assessments | 🔵 | Planned workflow expansion. |
| School challenges | ⚪ | Planned. |
| School resource distribution | 🔵 | Future school platform. |
| Parent companion | ⚪ | Planned. |
| Parent progress summaries | ⚪ | Planned, privacy-conscious. |
| Parent/teacher boundaries | 🔵 | Architecture requirement. |
| School-local environment | ⚪ | Future infrastructure. |

## I. Knowledge / Resources

| Capability | Status | Current truth / next move |
|---|---|---|
| Exam Hub | 🟡 | Existing surface. |
| Shadecode Library | 🔵 | Strategic direction. |
| Past-paper database | 🟡 | Ingestion work exists; metadata/mapping remain. |
| Document intelligence | 🔵 | Direction/foundations. |
| Authorized-source provenance | 🔵 | Required architecture. |
| One-tap offline packs | ⚪ | Planned. |
| Subject/level packs | ⚪ | Planned packaging system. |
| Local school resource hub | ⚪ | Future. |
| Peer resource exchange | 🔬 | Research only until safety/sync foundations mature. |

## J. Local-First / Offline Runtime

| Capability | Status | Current truth / next move |
|---|---|---|
| Offline-first principle | 🟢 | Explicit architecture/product requirement. |
| Local persistence | 🟡 | Foundations exist; coverage is incomplete. |
| Offline learning state | 🟡 | Pure local learning-state engine exists; product coverage remains. |
| Offline lessons | 🟡 | Partial, expand cache strategy. |
| Offline questions | 🟡 | Partial. |
| Offline exams | 🟡 | Needs robust Exam Simulation integration. |
| Offline projects | 🔵 | Direction/foundations. |
| Offline resources | 🟡 | Existing PWA/resource foundations; packs remain. |
| Offline event queue | 🟢/🟡 | Queue-backed canonical event delivery exists; broader sync hardening remains. |
| Deterministic synchronization | 🔵 | Sync revision protocol exists in live migration history; needs full audit. |
| Conflict resolution | ⚪ | Required for mature multi-device sync. |
| Local AI | 🔬 | Research. |
| Compressed models | 🔬 | Research. |
| Device-first intelligence | 🔵 | Architecture direction. |
| School local hub | ⚪ | Future. |
| Device-to-device/P2P | 🔬 | Research only, never an MVP dependency. |

## K. Trust / Safety / Platform

| Capability | Status | Current truth / next move |
|---|---|---|
| Supabase Auth | 🟢 | Existing. |
| RLS | 🟢 | Existing and authoritative. |
| Canonical durable evidence | 🟢 | `cortex_events` production foundation. |
| Data ownership | 🟡 | Foundation exists; memory/export/delete UX remains. |
| Memory controls | ⚪ | Planned. |
| AI-origin labelling | 🔵 | Required product principle; expand UX. |
| Provenance | 🟡 | Existing project/paper direction; broaden. |
| Deterministic calculations | 🟢/🟡 | Existing separation principle; audit AI-generated math workflows. |
| No fabricated evidence | 🟢 | Explicit architecture/product requirement. |
| Academic integrity | 🟡 | Project integrity foundations; expand across AI workflows. |
| Child safety | 🔵 | Primary requirement; implementation needed. |
| Accessibility | 🟡 | Existing platform work; comprehensive audit remains. |
| Performance | 🟡 | Ongoing reliability concern. |
| Observability | 🟡 | Sentry/CI foundations exist. |
| Deployment reliability | 🟡 | Prior Vercel issues require continued regression coverage. |
| PWA | 🟢/🟡 | Existing. |
| Mobile packaging | 🔵 | Future APK/native path. |
| Desktop | 🔵 | Direction/foundation. |

## L. Business / Ecosystem

| Capability | Status | Current truth / next move |
|---|---|---|
| Free core learning | ⚪ | Commercial decision after product value/retention validation. |
| Student paid tier | ⚪ | Experimental. |
| Learning packs | ⚪ | Product/commercial opportunity. |
| School plans | ⚪ | Future. |
| Certification/exam prep | ⚪ | Future. |
| Education API/infrastructure | 🔬 | Long-term possibility. |
| Hardware | 🔬 | Long-term research, never a current blocker. |
| Careers/opportunity network | 🟡 | Careers surface exists; network expansion remains. |

---

# 4. Shared Architecture Rule

The central learning evidence path is:

`learner action → canonical event → durable local/server persistence → learning observation → learning state → Cortex context → next action → measured outcome`

No new product surface should create a competing learning-event contract or competing mastery store without an explicit architectural decision.

`src/lib/intelligence/learningEvents.ts` is the canonical product-event boundary. `src/lib/cortex/learningEvents.ts` is a narrower adapter and should not become a second canonical event system.

`public.cortex_events` is the durable canonical event store. `public.topic_mastery` remains the established mastery store.

The local learning-state engine and durable mastery semantics must be reconciled before broad event-driven mastery updates are expanded.

---

# 5. Execution Principles

1. **Reality beats documentation.** If code/database behavior differs from a document, verify the behavior and correct the document.
2. **Evidence beats AI claims.** Generative models explain and assist; deterministic state, scores and provenance remain authoritative.
3. **Offline is a runtime mode.** Do not build features that become useless when connectivity disappears unless the feature explicitly requires cloud capability.
4. **No duplicate brains.** Reuse canonical events, mastery and learner state rather than creating parallel intelligence systems.
5. **Education contexts can differ.** Primary, Secondary and tertiary interfaces should feel native to their learners while sharing the underlying learning OS.
6. **Build vertical slices.** Prefer complete evidence loops over isolated screens.
7. **Do not overbuild speculative infrastructure.** P2P, multi-agent systems, hardware and local foundation models remain research until justified.
8. **Every meaningful user-visible change updates product documentation and public positioning where appropriate.**
9. **Every architecture change updates architecture records.**
10. **Every milestone updates this matrix.**

---

# 6. Current Highest-Priority Sequence

### P0: Make the existing learning spine trustworthy

1. Audit all real learning-action emitters.
2. Reconcile local `updateLearningState`, existing `blendMastery`, and server durable mastery semantics.
3. Audit sync revision protocol and local persistence coverage.
4. Add authenticated persistence/replay/offline recovery tests.
5. Stabilize Exam Simulation and Learn.
6. Verify evidence-to-recommendation behavior.

### P1: Turn evidence into useful intelligence

1. Mistake taxonomy.
2. Prerequisite graph.
3. Learning DNA.
4. Retention/forgetting model.
5. Intervention engine.
6. Next-best-action engine.
7. Learning Replay.

### P2: Expand learning and assessment

1. Question Forge.
2. Paper Intelligence.
3. Personal revision.
4. Concept Atlas.
5. Mistake Museum.
6. Personal Textbook.
7. Snap & Learn / handwriting intelligence.

### P3: Expand education contexts

1. Primary Discovery first real activity.
2. Primary child-safe Cortex and companion boundaries.
3. Campus academic structure.
4. Teacher/school workflows.
5. Parent companion.

### P4: Deep local-first capability

1. Offline learning packs.
2. Broader offline coverage.
3. Deterministic sync/conflict resolution.
4. Local model experiments.
5. School-local hub research.

---

# 7. Documentation Synchronization Contract

When implementation advances, update as applicable:

- this master roadmap;
- `docs/PRODUCT_VISION_2026-09-01.md`;
- architecture documents;
- README;
- public landing page/product copy;
- relevant feature contracts;
- issue/PR descriptions;
- migration records when database changes are introduced.

Do not claim a capability is shipped until it is verified in the repository/runtime. Do not leave strategic decisions only in chat.

---

# 8. Immediate Definition of Done

The first major milestone is not "all features built." It is a trustworthy learning operating-system spine where a real learner action can be performed, persisted locally/offline, synchronized safely, converted into canonical evidence, reflected in learner state, and used to produce a demonstrably better next action.

Once that spine is reliable, the rest of Shadecode can grow around it without becoming feature soup.

**Last updated:** 2026-09-01