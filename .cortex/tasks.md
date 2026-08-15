# 🧠 Cortex Task Roadmap
> This file is read by Cortex Engine every cycle.
> Cortex picks the highest priority incomplete task and works on it.
> Do not delete completed tasks — they are part of the audit trail.

---

## 🚀 Shadecode 2.0 Strategic Gap Roadmap

This section is the strategic layer above the feature backlog when the product is evolving toward a full academic intelligence platform.

### 🔴 Strategic priorities

- [x] 🔴 **Tertiary Education Support — Universities, Polytechnics & Colleges**
  - Generic academic model and initial normalized context are documented and tested.
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
- [ ] 🔴 **Cortex 2.0 Architecture**
- [ ] 🔴 **Security, Privacy & Academic Integrity**
- [ ] 🔴 **Observability & Product Intelligence**

### 🟡 Ecosystem priorities

- [ ] 🟡 **Shadecode SCS ↔ Shadecode Student Integration**
- [ ] 🟡 **Teacher & Lecturer Platform**
- [ ] 🟡 **Content & Knowledge Infrastructure**
- [ ] 🟡 **Student Collaboration**
- [ ] 🟡 **Unified Shadecode Identity**
- [ ] 🟡 **Business & Distribution Model**
- [ ] 🟡 **Zimbabwe → Africa Readiness**

### 🟢 Long-horizon research

- [ ] 🟢 Education P2P Network
- [ ] 🟢 Academic Digital Twin
- [ ] 🟢 Multi-Agent Cortex
- [ ] 🟢 Marketplace / Creator Economy
- [ ] 🟢 Science Platform / Hardware / Global Network

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
  - Initial audit: `docs/ASSESSMENT_INTELLIGENCE_AUDIT.md`.
  - Canonical domain contract: `docs/ASSESSMENT_EVIDENCE_CONTRACT.md`.
  - Non-persistent evidence model: `src/lib/assessment/evidence.ts`.
  - Unit coverage: `src/lib/assessment/__tests__/evidence.test.ts`.
  - Existing exam scoring, Exam Hub ingestion and syllabus mapping remain the producers to be adapted.
  - Next: build the adapter from current exam-marking results into `AssessmentEvidence`, preserving one stable assessment/attempt ID.
  - Then audit actual persisted `past_papers` / `syllabus_papers` / question fields before proposing migrations.

- [ ] 🔴 **Offline Sync Architecture Audit**
- [ ] 🔴 **Security Audit**
- [ ] 🔴 **Product Observability Audit**

---

## Phase 0 — Existing Infrastructure

Existing tables and mastery systems must be reused rather than recreated.

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
