# Shadecode Master Roadmap & Progress Matrix

**Date:** 2026-09-01  
**Status:** Authoritative strategic/engineering tracker  
**Scope:** All Shadecode capabilities discussed in the September 1 product-design work, reconciled against the verified repository state and known production foundations.

> This is the master scope. The three education experiences are only one workstream. Shadecode is being built as a local-first learning operating system with shared intelligence, learning, assessment, creation, people, knowledge, safety and platform foundations.

## 1. North Star

**Learn → Practice → Make mistakes → Understand why → Adapt → Re-test → Master → Remember**

The system should improve the learner's next action from real evidence, remain useful when connectivity disappears, and preserve useful learning state over time.

## 2. Status legend

- 🟢 **SHIPPED** — verified working capability/foundation exists.
- 🟡 **PARTIAL** — meaningful implementation exists but is incomplete or needs hardening.
- 🔵 **FOUNDATION** — architecture/data/UI groundwork exists; full end-user capability is not complete.
- 🟣 **IN DEVELOPMENT** — active execution priority.
- ⚪ **PLANNED** — agreed direction without sufficient implementation.
- 🔴 **REWORK / BLOCKED** — existing implementation needs correction before expansion.
- 🔬 **RESEARCH** — exploratory, not a current delivery dependency.

Status is conservative. A screen, API or prototype is not automatically a shipped capability.

---

# 3. Master Progress Matrix

## A. Cortex / Intelligence

| Capability | Status | Current truth / next move |
|---|---|---|
| Cortex intelligence layer | 🟡 | Existing production surface; unify evidence, state and recommendations. |
| Canonical learning events | 🟢 | Canonical ingress and durable `cortex_events` exist. |
| Event idempotency | 🟢 | Canonical identity is enforced by durable storage. |
| Learning observation adapter | 🟢 | Canonical events translate into Cortex observations. |
| Topic mastery | 🟡 | Established `topic_mastery` store is authoritative; semantics need reconciliation. |
| Retention / confidence / stability / exposure | 🔵 | Durable fields exist; calibrated learning model remains. |
| Error rate / response speed | 🔵 | Durable fields exist; richer evidence semantics remain. |
| Prerequisite health | 🔵 | Durable field exists; graph-backed inference remains. |
| Recent improvement / uncertainty | 🔵 | Durable fields exist; longitudinal semantics remain. |
| Learning DNA | ⚪ | Planned unified learner model. |
| Knowledge graph | 🔵 | Direction/data relationships defined; broad implementation remains. |
| Concept prerequisites | 🔵 | Architecture direction exists; graph inference remains. |
| Weak-area detection | 🟡 | Existing Cortex/analytics signals; canonical evidence integration remains. |
| Mistake intelligence | 🟡 | Existing analysis foundations; taxonomy/longitudinal patterns remain. |
| Forgetting radar | ⚪ | Planned. |
| Adaptive intervention engine | ⚪ | Planned after evidence/mastery semantics stabilize. |
| Next-best-action engine | 🔵 | Recommendation foundations exist; needs stronger evidence loop. |
| Recommendation engine | 🟡 | Existing recommendations; unify decision model. |
| Reflection engine | ⚪ | Planned. |
| Learning Replay | ⚪ | Planned. |
| Longitudinal learning | 🔵 | Data foundation exists; cross-time intelligence remains. |
| Tutor / Examiner / Coach / Analyst roles | 🟡 | Existing role-like capabilities across Cortex, exams and planning; consolidate semantics. |
| Career intelligence | 🟡 | Careers surface exists; evidence-based recommendations remain. |
| Multi-agent Cortex | 🔬 | Research until role separation is justified. |
| Model routing | 🟡 | Provider routing exists; local/cloud policy needs expansion. |
| Local specialized models | 🔬 | Research. |
| Quantization / distillation / pruning | 🔬 | Engineering research, not a product milestone. |
| AI provenance / safety | 🟡 | Principles and foundations exist; broaden across generated content. |

## B. Learning OS

| Capability | Status | Current truth / next move |
|---|---|---|
| Learn | 🟡 | Major production surface; evidence integration and coverage need work. |
| Curriculum-aware learning | 🟡 | Existing curriculum workflows; broader coverage required. |
| Deep lessons | 🟡 | Existing foundation; coverage/structure expansion remains. |
| Personalized explanations | 🟡 | AI capability exists; tie more tightly to learner state. |
| Multiple solution paths | ⚪ | Planned. |
| Show Your Work | 🟡 | Existing math/learning direction; expand structured evidence. |
| Question mutation | ⚪ | Planned. |
| Adaptive difficulty | 🟡 | Partial assessment/learning foundation. |
| Micro-learning | ⚪ | Planned. |
| Flashcards | 🟡 | Existing/partial revision capability; evidence-driven generation remains. |
| Revision packs | 🟡 | Foundations exist; make adaptive/offline-aware. |
| Personalized revision | 🟡 | Timetable/recommendation foundations; strengthen Cortex loop. |
| Oral learning | ⚪ | Planned. |
| Explain-it-like-X | ⚪ | Planned. |
| Curiosity / Why mode | ⚪ | Planned. |
| Real-world learning | ⚪ | Planned. |
| Cross-subject connections | ⚪ | Knowledge-graph dependency. |
| Personal Textbook | ⚪ | Planned. |
| Formula Book | 🔵 | Direction/foundation; unify as learner-owned artifact. |
| Concept Atlas | ⚪ | Planned. |
| Mistake Museum | ⚪ | Planned. |
| Local knowledge packs | 🔵 | Direction exists; packaging pipeline remains. |
| Local-language learning | ⚪ | Planned, Zimbabwe-first. |

## C. Assessment / Exam Intelligence

| Capability | Status | Current truth / next move |
|---|---|---|
| Exam Simulation | 🔴 | Existing surface has prior reliability issues; stabilize and browser-verify before expansion. |
| Real past-paper mode | 🟡 | Exam Hub/past-paper foundations exist. |
| Paper ingestion | 🟡 | Bulk ingestion work exists; mapping/coverage remains. |
| Question extraction | 🔵 | Structured ingestion direction exists; question database needs maturity. |
| Question provenance | 🔵 | Required architecture; broaden consistently. |
| Syllabus/topic mapping | 🟡 | Known ingestion gap. |
| Mark schemes | 🟡 | Resource pipeline foundation; coverage remains. |
| Examiner reports | ⚪ | Authorized-source integration planned. |
| Paper Intelligence | 🔵 | Architecture direction; implementation remains. |
| Question Forge | ⚪ | Planned shared generation engine. |
| Question similarity | ⚪ | Planned. |
| Topic frequency analysis | ⚪ | Planned. |
| Paper Replica | ⚪ | Planned. |
| Weakness Paper | ⚪ | Planned. |
| Quick Fire | ⚪ | Planned. |
| Boss / Nightmare | ⚪ | Planned. |
| Recovery assessments | ⚪ | Planned misconception-repair loop. |
| Post-exam intervention | 🟡 | Recommendation foundations exist; make evidence-driven. |
| Assessment analytics | 🟡 | Existing analytics; unify with Cortex state. |
| Cambridge | 🟡 | Core supported target; coverage must keep expanding. |
| ZIMSEC | 🟡 | Core supported target; coverage must keep expanding. |
| University / TVET assessment | 🔵 | Direction/foundation only. |

## D. Math / Science / Practical Intelligence

| Capability | Status | Current truth / next move |
|---|---|---|
| Math Checker | 🟡 | Existing surface; evolve toward working analysis. |
| Handwriting recognition | 🔵 | Image/math direction exists; robust reasoning extraction remains. |
| Step-by-step working analysis | 🔵 | Direction exists; structured evidence needed. |
| Graph intelligence | ⚪ | Planned. |
| Physics-aware tutoring | 🟡 | Existing curriculum/AI capability; formal subject intelligence remains. |
| Chemistry-aware tutoring | 🟡 | Partial generic/curriculum capability. |
| Biology-aware tutoring | 🟡 | Partial generic/curriculum capability. |
| Practical simulator | ⚪ | Planned. |
| Measurement / uncertainty lab | ⚪ | Planned. |
| Snap & Learn | 🔵 | Product direction defined; multimodal workflow remains. |
| Diagram understanding | ⚪ | Planned. |

## E. Creation / Projects / Research

| Capability | Status | Current truth / next move |
|---|---|---|
| Project Studio | 🟡 | Production surface with strong evidence/integrity foundations; finish-line verification remains. |
| Project planning | 🟢/🟡 | Staged workflow and deterministic production planning exist. |
| Research mode | 🔵 | Direction/foundations. |
| Research Vault | 🔵 | Direction/foundations. |
| Evidence collection | 🟡 | Project evidence capture exists. |
| Provenance / integrity | 🟡 | Existing project integrity work; broaden. |
| Portfolio | 🔵 | Direction exists. |
| Presentations | 🔵 | Direction/scaffolding exists. |
| Reflection | ⚪ | Planned. |
| STEM / science challenges | ⚪ | Planned. |
| Data Lab | ⚪ | Planned. |
| Creative mode | ⚪ | Planned. |
| Visual programming | ⚪ | Planned. |
| Coding Lab | 🟡 | Project/coding foundations exist; dedicated lab remains. |
| Algorithm visualisation | ⚪ | Planned. |
| Robotics | 🔬 | Future research/creation track. |
| Cortex Game Factory | 🔬 | Future research/creation track. |

## F. Engagement / Gamification

| Capability | Status | Current truth / next move |
|---|---|---|
| XP | 🟡 | Existing; centralization/reconciliation needed. |
| Levels | 🟡 | Existing foundation. |
| Achievements | 🟡 | Existing; event/completeness gaps remain. |
| Streaks | 🟡 | Existing. |
| Daily Challenges | 🟡 | Existing. |
| Leaderboards | 🟢 | Existing. |
| Missions | 🔵 | Direction; make missions evidence-driven. |
| Collections | 🔵 | Direction. |
| Learning worlds | ⚪ | Planned. |
| Gamified mastery | 🟡 | Connect rewards to meaningful learning evidence. |
| Weekly leagues | ⚪ | Planned. |
| Friend battles | ⚪ | Planned with safety controls. |
| Controlled class challenges | ⚪ | Planned. |
| Primary-safe rewards | 🔵 | Primary design requirement. |

## G. Education Experiences

| Experience | Status | Scope |
|---|---|---|
| Shadecode Student | 🟢 | Current production experience for Secondary/Cambridge/ZIMSEC. |
| Shadecode Discovery | 🔵 | Primary foundation and first-activity contract defined. |
| Shadecode Campus | 🔵 | University/college/polytechnic/TVET foundation direction. |
| Primary → Secondary continuity | ⚪ | Requires shared learner state/curriculum mapping. |
| Secondary → tertiary continuity | 🔵 | Architecture direction defined. |

**Primary:** own UX and content model, including reading adventures, phonics, handwriting, mental maths, stories, puzzles, science, drawing-to-understand, listen/respond, curiosity, world exploration, local language, careers, child-safe Cortex and parent/teacher companions.

**Student:** secondary learning, Cambridge/ZIMSEC, mastery, revision, past papers, Exam Simulation, assignments, projects, planning, Cortex, analytics, careers and university preparation.

**Campus:** university, college, polytechnic and TVET structures, programmes, modules, terms/semesters, coursework, assignments, research, projects, portfolios, labs, skills, internships, scholarships and careers.

## H. Teacher / School / Parent

| Capability | Status | Current truth / next move |
|---|---|---|
| Teacher intelligence | ⚪ | Planned. |
| Marking assistant | 🔵 | Direction; safeguards required. |
| Intervention recommendations | 🔵 | Cortex dependency. |
| Classroom knowledge map | ⚪ | Planned. |
| Student progress intelligence | 🔵 | Analytics foundations; aggregation remains. |
| Teacher assessments | 🔵 | Planned. |
| School challenges | ⚪ | Planned. |
| School resource distribution | 🔵 | Future platform. |
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
| Document intelligence | 🔵 | Direction/foundation. |
| Authorized-source provenance | 🔵 | Required architecture. |
| One-tap offline packs | ⚪ | Planned. |
| Subject/level packs | ⚪ | Planned packaging system. |
| Local school resource hub | ⚪ | Future. |
| Peer resource exchange | 🔬 | Research only until single-device offline and authenticated sync mature. |

## J. Local-First / Offline Runtime

| Capability | Status | Current truth / next move |
|---|---|---|
| Offline-first principle | 🟢 | Explicit product/architecture requirement. |
| Local persistence | 🟡 | Foundations exist; coverage incomplete. |
| Offline learning state | 🟡 | Pure local engine exists; product coverage remains. |
| Offline lessons | 🟡 | Partial. |
| Offline questions | 🟡 | Partial. |
| Offline exams | 🔴 | Needs robust Exam Simulation integration. |
| Offline projects | 🔵 | Direction/foundations. |
| Offline resources | 🟡 | PWA/resource foundations; packs remain. |
| Offline event queue | 🟢 | Bounded reconnect-safe Cortex queue exists. |
| Deterministic synchronization | 🔵 | Live sync-revision protocol history exists; repository/runtime integration audit remains. |
| Conflict resolution | ⚪ | Required for mature multi-device sync. |
| Local AI | 🔬 | Research. |
| Compressed models | 🔬 | Research. |
| Device-first intelligence | 🔵 | Architecture direction. |
| School local hub | ⚪ | Future. |
| Device-to-device / P2P | 🔬 | Research only. |

## K. Trust / Safety / Platform

| Capability | Status | Current truth / next move |
|---|---|---|
| Supabase Auth | 🟢 | Existing. |
| RLS | 🟢 | Existing and authoritative. |
| Canonical durable evidence | 🟢 | `cortex_events` production foundation. |
| Data ownership | 🟡 | Foundation; memory/export/delete UX remains. |
| Memory controls | ⚪ | Planned. |
| AI-origin labelling | 🔵 | Required; expand UX. |
| Provenance | 🟡 | Existing project/paper direction; broaden. |
| Deterministic calculations | 🟡 | Separation principle exists; audit AI math workflows. |
| No fabricated evidence | 🟢 | Explicit architecture requirement. |
| Academic integrity | 🟡 | Project integrity foundations; expand across AI workflows. |
| Child safety | 🔵 | Primary requirement; implementation needed. |
| Accessibility | 🟡 | Existing work; comprehensive audit remains. |
| Performance | 🟡 | Ongoing reliability concern. |
| Observability | 🟡 | Sentry/CI foundations exist. |
| Deployment reliability | 🟡 | Prior Vercel issues require regression coverage. |
| PWA | 🟡 | Existing. |
| Mobile packaging | 🔵 | APK/native path remains future. |
| Desktop | 🔵 | Direction/foundation. |

## L. Business / Ecosystem

| Capability | Status | Current truth / next move |
|---|---|---|
| Free core learning | ⚪ | Commercial decision after value/retention validation. |
| Student paid tier | ⚪ | Experimental. |
| Learning packs | ⚪ | Product/commercial opportunity. |
| School plans | ⚪ | Future. |
| Certification / exam prep | ⚪ | Future. |
| Education API / infrastructure | 🔬 | Long-term possibility. |
| Hardware | 🔬 | Long-term research, never current blocker. |
| Careers/opportunity network | 🟡 | Careers surface exists; network expansion remains. |

---

# 4. Verified 2026-09-01 Engineering State

- Canonical learning events are durably persisted in `public.cortex_events` with canonical event identity and authenticated ingress.
- Supported evidence can update the established `public.topic_mastery` store; no second mastery table was introduced.
- Durable topic-state fields now include retention, confidence, stability, exposure, error rate, response speed, prerequisite health, recent improvement and uncertainty.
- Browser Cortex events use a bounded local queue and reconnect flushing.
- Learn, task completion, Exam Simulation and Project Studio have canonical-event integrations at the helper level; remaining browser-level call-site validation is still required.
- The repository has substantial local-first infrastructure for tasks, subjects and lesson progress, plus a separate Cortex event queue.
- The live database has sync-revision protocol history; its complete entity coverage and repository migration representation still need audit.
- A recent local verification pass reported clean typecheck, lint and production build, with the full test suite at 391/394 passing and 3 todo. This is a historical verification snapshot, not a substitute for rerunning the current head after subsequent documentation commits.

# 5. Current Execution Board

### P0 — Trust the spine

1. Audit every real lesson/question/exam action against canonical event emission.
2. Reconcile `updateLearningState`, `blendMastery` and durable `topic_mastery` semantics. **Do not broaden the server formula until this is resolved.**
3. Audit sync-revision protocol and local persistence coverage.
4. Add authenticated persistence, replay and offline recovery E2E coverage.
5. Stabilize Exam Simulation and Learn, including browser smoke verification.
6. Verify evidence → state → recommendation behavior.

### P1 — Make Cortex genuinely adaptive

1. Mistake taxonomy.
2. Prerequisite graph.
3. Learning DNA.
4. Retention/forgetting model.
5. Intervention engine.
6. Next-best-action engine.
7. Learning Replay.

### P2 — Expand Learning + Assessment

1. Question Forge.
2. Paper Intelligence.
3. Personalized revision.
4. Concept Atlas.
5. Mistake Museum.
6. Personal Textbook.
7. Snap & Learn / handwriting intelligence.

### P3 — Expand education contexts

1. Primary Discovery first real activity.
2. Primary child-safe Cortex and companion boundaries.
3. Campus academic structure.
4. Teacher/school workflows.
5. Parent companion.

### P4 — Deep local-first capability

1. Offline learning packs.
2. Broader offline coverage.
3. Deterministic sync/conflict resolution.
4. Local model experiments.
5. School-local hub research.

---

# 6. Documentation Synchronization Contract

When implementation advances, update as applicable:

- this master roadmap;
- `docs/PRODUCT_VISION_2026-09-01.md`;
- architecture documents;
- README;
- public landing page/product copy;
- relevant feature contracts;
- issue/PR descriptions;
- migration records when database changes are introduced;
- `DEVLOG.md` for significant engineering passes.

Do not claim a capability is shipped until verified in repository/runtime. Do not leave strategic decisions only in chat.

# 7. Definition of Done for the First Major Milestone

A trustworthy learning-OS spine where a real learner action can be performed, persisted locally/offline, synchronized safely, converted into canonical evidence, reflected in learner state, and used to produce a demonstrably better next action.

Once that spine is reliable, the rest of Shadecode can grow around it without becoming feature soup.

**Last updated:** 2026-09-01