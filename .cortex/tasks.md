# 🧠 Cortex Task Roadmap
> This file is read by Cortex Engine every cycle.
> Cortex picks the highest priority incomplete task and works on it.
> Do not delete completed tasks — they are part of the audit trail.

---

## 🚀 Shadecode 2.0 Strategic Gap Roadmap

This section is the strategic layer above the feature backlog. It prevents Cortex from treating Shadecode as a collection of isolated UI features when the product is evolving toward a full academic intelligence platform.

### 🔴 Strategic priorities

- [x] 🔴 **Tertiary Education Support — Universities, Polytechnics & Colleges**
  - Generic academic model and initial normalized context are now documented and tested.
  - Full persistence and institution integrations remain future implementation slices.

- [ ] 🔴 **Student Knowledge & Mastery Graph**
  - Evolve from isolated activity records toward topic-level knowledge state.
  - Track mastery, confidence, evidence, recency, misconceptions and decay.
  - Connect subjects/courses → topics → questions → mistakes → lessons → assessments.
  - Use existing `topic_mastery` as the seed rather than creating a second competing mastery system.

- [~] 🔴 **Assessment Intelligence & Past-Paper Intelligence**
  - Make past papers, mark schemes, syllabuses and question metadata machine-readable.
  - Map questions to curriculum topics and difficulty.
  - Classify mistakes and identify likely mark-loss areas.
  - Use assessment evidence to drive revision and recommendations rather than generic AI generation.

- [ ] 🔴 **Offline-First Learning Architecture**
  - Treat local storage/database, queued writes, synchronization and conflict handling as core architecture.
  - Cache lessons, questions, progress and selected media for intermittent-connectivity use.
  - Design the sync layer so future peer-to-peer educational exchange is possible without making P2P a current dependency.

- [ ] 🔴 **Cortex 2.0 Architecture**
  - Separate student-facing Cortex intelligence from Cortex Engineering's autonomous repository agent.
  - Progress toward memory hierarchy, knowledge graph, planning, forecasting and specialized agents.
  - Introduce model routing, semantic caching and local/cheap inference where appropriate to control AI cost.

- [ ] 🔴 **Security, Privacy & Academic Integrity**
  - Audit authentication, authorization/RLS, API boundaries, file uploads, secrets, rate limits and student-data isolation.
  - Add explicit academic-integrity safeguards and graduated assistance for assignments/exams.
  - Define privacy boundaries for student, parent, teacher and institution views.

- [ ] 🔴 **Observability & Product Intelligence**
  - Measure activation, retention, feature usage, AI failures, sync failures, latency and cost per active learner.
  - Add error/event instrumentation before scaling traffic.
  - Establish a small set of product health metrics that guide engineering priorities.

### 🟡 Ecosystem priorities

- [ ] 🟡 **Shadecode SCS ↔ Shadecode Student Integration**
  - Connect school identity, classes, subjects, teachers, attendance/results and announcements to learning intelligence where permissions allow.
  - Keep private student learning data separate from administrative views by default.

- [ ] 🟡 **Teacher & Lecturer Platform**
  - Let educators create/import assessments and learning material.
  - Generate topic analytics and class-level weakness summaries.
  - Build distribution loops between educator content and student learning.

- [ ] 🟡 **Content & Knowledge Infrastructure**
  - Establish ingestion, provenance, versioning, curriculum mapping, search and retrieval for legitimate educational content.
  - Prioritize official syllabuses, past papers/mark schemes and high-value practice material.

- [ ] 🟡 **Student Collaboration**
  - Study rooms, shared notes, group challenges, peer explanations and institution/course communities.
  - Design moderation and privacy before enabling open community features.

- [ ] 🟡 **Unified Shadecode Identity**
  - One identity/permission model spanning Student, SCS and future Shadecode products.
  - Support student, teacher, parent, institution and developer roles without coupling their data unnecessarily.

- [ ] 🟡 **Business & Distribution Model**
  - Define what students, parents, schools, universities and institutions pay for.
  - Test free/paid boundaries only after activation and retention data identify the strongest value loops.

- [ ] 🟡 **Zimbabwe → Africa Readiness**
  - Optimize for low data, intermittent connectivity, mobile-first access, low-end hardware and local curricula/qualifications.
  - Treat Zimbabwe as an initial validation environment, not the permanent ceiling of the product.

### 🟢 Long-horizon research

- [ ] 🟢 **Education P2P Network**
- [ ] 🟢 **Academic Digital Twin**
- [ ] 🟢 **Multi-Agent Cortex**
- [ ] 🟢 **Marketplace / Creator Economy**
- [ ] 🟢 **Science Platform / Hardware / Global Network**

### 🚫 Anti-scope-creep rules

- Do not build every blueprint idea simultaneously.
- Do not create duplicate systems when a working implementation exists.
- Do not replace real curriculum/assessment evidence with fabricated AI content.
- Do not build native apps before the web/offline architecture and product-market evidence justify them.
- Do not make P2P, digital-twin or multi-agent architecture a prerequisite for current student value.

---

## 🔴 Immediate Execution Queue

- [x] 🔴 **Tertiary Academic Model — discovery/specification**
  - `docs/TERTIARY_ACADEMIC_MODEL_SPEC.md`
  - `docs/TERTIARY_ACADEMIC_MODEL_AUDIT.md`
  - `src/lib/academic/context.ts`
  - `src/lib/academic/__tests__/context.test.ts`
  - No new database tables or institution integrations were introduced.

- [~] 🔴 **Assessment Intelligence — curriculum/past-paper audit**
  - Baseline documented in `docs/ASSESSMENT_INTELLIGENCE_AUDIT.md`.
  - Existing Exam Hub, qualification-mapping and exam-marking infrastructure identified.
  - Next: inspect actual persisted paper/question/qualification fields and define the canonical evidence contract.

- [ ] 🔴 **Offline Sync Architecture Audit**
  - Inventory current offline/PWA behavior, caching, persistence and mutation paths.
  - Produce a sync contract before implementing P2P or deeper offline functionality.

- [ ] 🔴 **Security Audit**
  - Review auth, RLS, API routes, service-role usage, uploads, secrets and AI-provider boundaries.

- [ ] 🔴 **Product Observability Audit**
  - Identify missing activation, retention, error, latency and AI-cost events.

---

## Phase 0 — Database Foundation (Complete)

Existing tables must be reused rather than recreated.

- [x] insights
- [x] daily_challenges
- [x] achievements
- [x] cortex_insights
- [x] topic_mastery producer/consumer wiring

---

## Verified Existing Feature Backlog

- [x] Daily Challenge
- [x] Badges & Achievements
- [x] Retention Risk / Priority Engine Factor 4
- [x] Leaderboard
- [x] Onboarding Flow
- [x] Audio Lessons — Tier 1
- [ ] Scheduling Engine wiring
- [ ] Insight History summary
- [ ] Goals System
- [ ] Streak Display Improvements
- [ ] Subject Progress Visualization
- [ ] Dashboard Redesign
- [ ] Cortex Prompt Quality Improvement

---

## 📋 Cortex Rules

1. Always open a PR — never push directly to main.
2. One task at a time — finish before starting the next.
3. Update this file each cycle — mark tasks `[~]` when starting and `[x]` when actually merged.
4. Update `DEVLOG.md` every cycle.
5. If a task is too large, split it and document the boundary.
6. Prioritize retention and learning outcomes over aesthetics.
7. Search the existing codebase before creating a new implementation.
8. Do not create duplicate components, routes, engines or data models.
9. Never create database tables that already exist; verify schema first.
10. All app code goes under `src/`.
11. Use the repository's existing TypeScript/JavaScript conventions.
12. Never use `@supabase/auth-helpers-nextjs`.
13. Math Checker and Learn pages already exist; do not recreate them.
14. Never invent curriculum topics, exam readiness scores, mastery claims or academic content when real evidence is unavailable.
15. Before building a feature, identify its source of truth and at least one producer/consumer path.
16. Strategic roadmap items are not permission to start large future systems prematurely; execute the immediate queue and verified backlog first.
