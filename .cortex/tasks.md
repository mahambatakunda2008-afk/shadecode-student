# 🧠 Cortex Task Roadmap
> This file is read by Cortex Engine every cycle.
> Cortex picks the highest priority incomplete task and works on it.
> Do not delete completed tasks — they are part of the audit trail.

---

## 🚀 Shadecode 2.0 Strategic Gap Roadmap

This section is the strategic layer above the feature backlog. It prevents Cortex from treating Shadecode as a collection of isolated UI features when the product is evolving toward a full academic intelligence platform.

### 🔴 Strategic priorities

- [~] 🔴 **Tertiary Education Support — Universities, Polytechnics & Colleges**
  - Add an education-level model covering secondary, university, polytechnic, college and technical/vocational pathways.
  - Support courses/modules, semesters, credits, assignments, coursework, labs, projects, research and GPA/grade tracking.
  - Make curriculum, qualification and institution context first-class inputs to Cortex.
  - Do not build institution-specific integrations until the generic academic model is defined.

- [ ] 🔴 **Student Knowledge & Mastery Graph**
  - Evolve from isolated activity records toward topic-level knowledge state.
  - Track mastery, confidence, evidence, recency, misconceptions and decay.
  - Connect subjects/courses → topics → questions → mistakes → lessons → assessments.
  - Use existing `topic_mastery` as the seed rather than creating a second competing mastery system.

- [ ] 🔴 **Assessment Intelligence & Past-Paper Intelligence**
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
  - Research device-to-device exchange of lessons, questions, media and other permitted educational assets.
  - Cloud remains coordination/storage where needed; P2P must be optional and privacy/security-preserving.
  - Do not make P2P a prerequisite for the MVP.

- [ ] 🟢 **Academic Digital Twin**
  - Only after the knowledge graph and assessment evidence are mature.
  - Model learning, workload, goals, performance and other academic dimensions incrementally.

- [ ] 🟢 **Multi-Agent Cortex**
  - Tutor, Planner, Coach, Analyst, Creator, Career and Community roles should emerge from validated use cases, not exist merely as separate AI prompts.

- [ ] 🟢 **Marketplace / Creator Economy**
  - Teacher/student-created lessons, question sets and revision resources with provenance, moderation and quality signals.

- [ ] 🟢 **Science Platform / Hardware / Global Network**
  - Virtual labs, simulation engine, Learning Box, global education network and other blueprint-scale initiatives remain future products, not current blockers.

### 🚫 Anti-scope-creep rules

- Do not build every blueprint idea simultaneously.
- Do not create duplicate systems when a working implementation already exists.
- Do not replace real curriculum/assessment evidence with fabricated AI content.
- Do not build native apps before the web/offline architecture and product-market evidence justify them.
- Do not make P2P, digital-twin or multi-agent architecture a prerequisite for current student value.

---

## 🔴 Immediate Execution Queue

The strategic roadmap above does not replace the verified implementation backlog below. Near-term execution should prioritize completing dormant real infrastructure before inventing new parallel systems.

- [~] 🔴 **Tertiary Academic Model — discovery/specification first**
  - Define the minimum generic model for institution → qualification/program → course/module → semester/term → assessment.
  - Audit current `profiles`, `subjects`, `exams`, `study_topics` and onboarding data before adding anything.
  - Deliver a written model and gap list before implementation.
  - Discovery output: `docs/TERTIARY_ACADEMIC_MODEL_SPEC.md`.
  - Initial implementation: `src/lib/academic/context.ts` provides a non-persistent normalized academic context.
  - Known defect corrected: A-Level is no longer persisted as `university`; it remains under the current `secondary` enum while the normalized context preserves `a_level`.

- [ ] 🔴 **Assessment Intelligence — curriculum/past-paper audit**
  - Audit current Exam Hub ingestion, past-paper metadata and syllabus mappings.
  - Define canonical question/topic/assessment entities before building prediction features.

- [ ] 🔴 **Offline Sync Architecture Audit**
  - Inventory current offline/PWA behavior, caching, persistence and mutation paths.
  - Produce a sync contract before implementing P2P or deeper offline functionality.

- [ ] 🔴 **Security Audit**
  - Review auth, RLS, API routes, service-role usage, uploads, secrets and AI-provider boundaries.

- [ ] 🔴 **Product Observability Audit**
  - Identify missing activation, retention, error, latency and AI-cost events.

---

## Phase 0 — Database Foundation (Complete)

These tables already exist in Supabase. Do NOT recreate them.
Existing tables: `achievements`, `cortex_insights`, `daily_challenges`, `exams`, `insights`, `profiles`, `study_topics`, `subjects`, `tasks`, `timetable`

- [x] 🔴 Create `insights` Supabase table
- [x] 🔴 Create `daily_challenges` Supabase table
- [x] 🔴 Create `achievements` Supabase table
- [x] 🔴 Create `cortex_insights` Supabase table
- [x] 🔴 insights table is confirmed working (empty = no data yet, not broken)

---

## 🔴 Phase 1 — Frontend Features

- [x] 🔴 **Daily Challenge Component**
  - Already implemented on main: `src/components/DailyChallenge.jsx`, `src/app/api/challenges/today/route.js`, `src/app/api/challenges/today/complete/route.js`.
  - Was still marked `[ ]`, causing repeated autonomous regeneration and redundant PRs. Marked complete to prevent duplication.

- [x] 🔴 **Badges & Achievements Display**
  - Already implemented on main under `src/app/(app)/achievements/page.tsx`, `src/contexts/AchievementsContext.tsx`, `src/hooks/useAchievements.ts`, `src/app/api/achievements/route.ts` with the live achievement system and unlock notifications.
  - Older duplicate `BadgeDisplay.jsx`/`route.js` implementation was removed as dead/conflicting code. Marked complete to prevent regeneration.

- [x] 🔴 **Retention Risk / Priority Engine Factor 4**
  - `topic_mastery` is now written after marked exams and read by retention-risk analysis; `retention_risk` is an explainable recommendation factor. Full matrix: `docs/BLUEPRINT_GAP_MATRIX.md`.

- [ ] 🟡 **Scheduling Engine (Mission Control Ch.8) — finish wiring dormant infrastructure**
  - `src/lib/studyPlan/generator.ts` contains real weighted scheduling logic and uses real topic hints.
  - `src/components/StudyPlanDisplay.tsx` exists but the system has no real caller/API/page yet.
  - Decide the canonical generator, audit onboarding/settings for goal data, add persistence only if required, then wire one API route + page and verify thoroughly.

- [ ] 🟡 **Insight History — most frequent pattern summary**
  - Existing page: `src/app/(app)/insights/history/page.tsx`.
  - Add only the missing summary block. Do not rebuild the page.

---

## 🟡 Phase 2 — Social & Competition

- [x] 🟡 **Leaderboard Page**
  - Already built and wired in `src/app/(app)/leaderboard/page.tsx` and navigation. Marked complete to prevent duplicate implementations.

- [ ] 🟡 **Goals System**
  - Let users set a weekly study goal, show progress, and expose goal progress to Cortex.

- [ ] 🟡 **Streak Display Improvements**
  - Improve visibility and evaluate a streak-freeze mechanic with clear abuse/edge-case rules.

---

## 🟢 Phase 3 — Polish & Experience

- [ ] 🟢 **Subject Progress Visualization**
  - Show real per-subject progress using existing learning evidence.

- [ ] 🟢 **Dashboard Redesign**
  - Consolidate mission, progress, streak, challenge and Cortex signals only after the underlying data is reliable.

- [x] 🟢 **Onboarding Flow**
  - Current onboarding is a live multi-step flow with API completion/reset and recommendations. Older orphaned step components were removed after verification.

- [x] 🟢 **Audio Lessons — Tier 1**
  - Browser narration and voice commands shipped. Tier 2 cloud TTS/native background behavior remains deferred pending evidence of use.

- [ ] 🟢 **Cortex Prompt Quality Improvement**
  - Improve insight generation using actual subject names, tasks and evidence. Avoid generic/fabricated claims.

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
11. Use the repository's existing TypeScript/JavaScript conventions; do not impose a second module/style system.
12. Never use `@supabase/auth-helpers-nextjs`.
13. Math Checker and Learn pages already exist; do not recreate them.
14. The `insights` table exists and an empty table is not a schema failure.
15. Never invent curriculum topics, exam readiness scores, mastery claims or academic content when real evidence is unavailable.
16. Before building a feature, identify its source of truth and at least one producer/consumer path.
17. Strategic roadmap items are not permission to start large future systems prematurely; execute the immediate queue and verified backlog first.
