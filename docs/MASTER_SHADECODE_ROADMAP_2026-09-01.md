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
| Canonical learning events | 🟢 | Canonical authenticated ingress and durable `cortex_events` exist; ingress is persistence-only. |
| Event idempotency | 🟢 | Canonical identity is enforced by durable storage. |
| Learning observation adapter | 🟢 | Canonical events translate into Cortex observations. |
| Topic mastery | 🟡 | Established `topic_mastery` store is authoritative; event-driven and local semantics are being reconciled before further mutation. |
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
| Shadecode Discovery | 🔵 | Primary experience foundation/design; first activity is next major vertical slice. |
| Shadecode Campus | 🔵 | University/Polytechnic/TVET architecture foundation; product surface remains planned. |

## 4. Current execution order

1. **Evidence spine:** canonical event ingress, offline queue, durable persistence, deterministic observation.
2. **Mastery reconciliation:** choose and implement one authoritative state-transition algorithm before broadening event-driven mastery.
3. **Offline sync protocol:** audit revision/conflict semantics across all local-first entities.
4. **Verification:** authenticated, offline, reconnect, replay/idempotency, and E2E coverage.
5. **Primary vertical slice:** My Day → activity → attempt → feedback → learning event → mastery → next activity.
6. **Student hardening:** stabilize Exam Simulation and connect the mature evidence loop to existing Student surfaces.
7. **Campus foundation:** extend shared platform contracts only where real Campus requirements demand it.

## 5. Documentation synchronization contract

Whenever engineering changes a capability, update the relevant architecture/status document in the same workstream. Do not describe a prototype as shipped. The repository, production database and deployment behavior are the sources of truth.

## 6. September 1 engineering checkpoint

- **Offline sync revision protocol:** 🟢 core protocol merged to `main` in commit `85474ab84073a2923102d650eb888d4f55aec5b7`.
- **Conflict persistence:** 🟢 IndexedDB conflict store and local conflict recording are implemented.
- **Authenticated OCC relay:** 🟢 `/api/sync` accepts authenticated `tasks`, `subjects`, and `learn_lessons` mutations with `baseVersion`, `clientVersion`, and `deviceId`.
- **Production database protocol:** 🟢 hardened `apply_sync_mutation` is SECURITY INVOKER and production conflict behavior has been transaction-tested.
- **Education profile sync:** 🔵 intentionally deferred because the live `user_profiles` schema does not currently contain the education fields assumed by the older prototype. Do not mark this as shipped until schema and contract are aligned.
- **Dashboard device-first launch:** 🟡 cache fallback exists, but the dashboard still has a blocking initial auth/exams gate before its UI can mount. This is the next hardening target.
- **Production deployment:** 🟡 latest Vercel deployment is still an older/main build; the September 1 sync commit has not yet produced a new `main` deployment at checkpoint time. Verify deployment before calling the new sync code production-shipped.

## 7. Immediate next engineering moves

1. Remove the dashboard's network-dependent mount gate so cached/local state can paint first.
2. Make authentication/session discovery non-blocking where the existing shell can safely remain mounted.
3. Keep exams and Cortex reconciliation as background work, never as a prerequisite for first paint.
4. Replace any source-string-only sync tests with behavioral tests covering accepted, replayed/idempotent, stale-conflict, and offline-queue scenarios.
5. Browser-verify dashboard launch offline and reconnect behavior, then update this matrix from 🟡 to 🟢 only when observed.
6. Return to education-profile synchronization only after the database contract is explicitly aligned.
