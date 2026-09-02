# Shadecode Master Roadmap & Progress Matrix

**Date:** 2026-09-02  
**Status:** Authoritative strategic/engineering tracker  
**Scope:** All Shadecode capabilities discussed in the September 1-2 product-design work, reconciled against the verified repository state and known production foundations.

> This is the master scope. The three education experiences are only one workstream. Shadecode is being built as a local-first learning operating system with shared intelligence, learning, assessment, creation, people, knowledge, safety and platform foundations.

## 1. North Star

**Learn → Practice → Make mistakes → Understand why → Adapt → Re-test → Master → Remember**

The system should improve the learner's next action from real evidence, remain useful when connectivity disappears, and preserve useful learning state over time.

## 2. Build / Release principle

**Build aggressively. Release progressively.**

The engineering target is capability completeness, not exposing every capability immediately. A capability can be built, tested and kept behind contextual/progressive release while the default experience remains focused for the learner's education level. See `docs/CAPABILITY_REGISTRY.md` for the separate engineering-truth and product-release views.

## 3. Status legend

- 🟢 **SHIPPED** — verified working capability/foundation exists.
- 🟡 **PARTIAL** — meaningful implementation exists but is incomplete or needs hardening.
- 🔵 **FOUNDATION** — architecture/data/UI groundwork exists; full end-user capability is not complete.
- 🟣 **IN DEVELOPMENT** — active execution priority.
- ⚪ **PLANNED** — agreed direction without sufficient implementation.
- 🔴 **REWORK / BLOCKED** — existing implementation needs correction before expansion.
- 🔬 **RESEARCH** — exploratory, not a current delivery dependency.

Status is conservative. A screen, API or prototype is not automatically a shipped capability.

---

# 4. Master Progress Matrix

## A. Cortex / Intelligence

| Capability | Status | Current truth / next move |
|---|---|---|
| Cortex intelligence layer | 🟡 | Existing production surface; unify evidence, state and recommendations. |
| Canonical learning events | 🟢 | Canonical authenticated ingress and durable `cortex_events` exist; ingress is persistence-only. |
| Event idempotency | 🟢 | Canonical identity is enforced by durable storage. |
| Account-scoped offline event queue | 🟢 | Queue is owner-scoped and only flushes events for the active learner. |
| Learning observation adapter | 🟢 | Canonical events translate into Cortex observations, including optional graded percentage evidence. Aggregate-only completions are excluded from mastery observations. |
| Topic mastery | 🟡 | Established `topic_mastery` store is authoritative; shared score transition and pure richer reducer exist, but durable richer projection is not yet wired into all evidence consumers. |
| Rich learning-state reducer | 🔵 | Deterministic pure reducer exists for mastery, retention, confidence, stability, exposure, error rate, response speed, improvement and uncertainty. |
| Durable richer mastery projection | 🟣 | Next major engineering task: persist the reducer output through exactly one authoritative consumer without double-counting existing exam aggregates. |
| Retention / confidence / stability / exposure | 🔵 | Durable fields exist; deterministic reducer exists; calibration remains. |
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
| Primary-safe rewards | 🟡 | First Discovery activity has child-safe local star rewards; broader reward system remains. |

## G. Education Experiences

| Experience | Status | Scope |
|---|---|---|
| Shadecode Student | 🟢 | Current production experience for Secondary/Cambridge/ZIMSEC. |
| Shadecode Discovery | 🟣 | First Primary Number Explorer vertical slice is implemented at `/discovery`; browser/E2E verification remains. |
| Shadecode Campus | 🔵 | University/Polytechnic/TVET architecture foundation; product surface remains planned. |

## 5. Current execution order

1. **Evidence spine:** canonical event ingress, offline queue, durable persistence, deterministic observation.
2. **Mastery reconciliation:** shared score transition and deterministic richer reducer are defined; wire durable rich-state projection through one authoritative consumer without double-counting existing exam aggregates.
3. **Offline sync protocol:** authenticated revision/conflict path is live for `tasks`, `subjects`, and `learn_lessons`; ownership hardening is represented in source migration.
4. **Verification:** authenticated, offline, reconnect, replay/idempotency, and browser/E2E coverage.
5. **Primary vertical slice:** Number Explorer now uses a unique activity instance ID so repeated runs cannot collapse into one canonical event identity. Verify the complete My Day → activity → attempt → feedback → learning event → mastery → next activity loop, then add the next Primary activity.
6. **Student hardening:** stabilize Exam Simulation and connect the mature evidence loop to existing Student surfaces.
7. **Campus foundation:** extend shared platform contracts only where real Campus requirements demand it.
8. **Capability expansion:** continue implementing the underlying capability registry while controlling which capabilities are exposed by default in each experience.

## 6. Documentation synchronization contract

Whenever engineering changes a capability, update the relevant architecture/status document in the same workstream. Do not describe a prototype as shipped. The repository, production database and deployment behavior are the sources of truth.

## 7. September 2 engineering checkpoint

- **Capability registry:** 🟢 added `docs/CAPABILITY_REGISTRY.md` to separate engineering capability completeness from progressive product release.
- **Discovery event identity:** 🟢 each Number Explorer run now has a unique persisted activity instance ID; question and completion event identities are scoped to that run.
- **Aggregate evidence semantics:** 🟢 aggregate-only completion events are explicitly excluded from mastery observations to prevent future double-counting when question evidence is already present.
- **Rich learning-state reducer:** 🔵 deterministic pure reducer exists; durable projection remains the active implementation target.
- **Offline sync ownership:** 🟢 live ownership hardening and matching source migration remain in place.
- **Discovery Primary:** 🟣 first Number Explorer activity remains implemented; browser/E2E verification is still required.
- **Production deployment:** 🟡 do not call the latest engineering changes production-shipped until the corresponding Vercel deployment is observed and browser-verified.

## 8. Immediate next engineering moves

1. Add browser/E2E coverage for `/discovery`, offline resume, canonical event replay, and sync conflicts.
2. Wire the richer state projection into one selected evidence consumer, with event-level idempotency and explicit evidence-source semantics.
3. Stabilize and browser-verify Exam Simulation.
4. Audit Learn completion/question evidence call sites.
5. Add the next Primary activity only after the first loop is verified.
6. Continue filling the capability registry in dependency order, while keeping default UI release progressive.
