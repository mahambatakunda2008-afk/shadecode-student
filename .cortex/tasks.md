# 🧠 Cortex Task Roadmap
> This file is read by Cortex Engine every cycle.
> Cortex picks the highest priority incomplete task and works on it.
> Do not delete completed tasks — they are part of the audit trail.

---

## 🚀 Shadecode 2.0 Strategic Gap Roadmap

This section is the strategic layer above the feature backlog. It prevents Cortex from treating Shadecode as a collection of isolated UI features when the product is evolving toward a full academic intelligence platform.

### 🔴 Strategic priorities

- [ ] 🔴 **Tertiary Education Support — Universities, Polytechnics & Colleges**
  - Add an education-level model covering secondary, university, polytechnic, college and technical/vocational pathways.
  - Support courses/modules, semesters, credits, assignments, coursework, labs, projects, research and GPA/grade tracking.
  - Make curriculum, qualification and institution context first-class inputs to Cortex.
  - Do not build institution-specific integrations until the generic academic model is defined.

- [ ] 🔴 **Student Knowledge & Mastery Graph**
  - Evolve from isolated activity records toward topic-level knowledge state.
  - Track mastery, confidence, evidence, recency, misconceptions and decay.
  - Connect subjects/courses → topics → questions → mistakes → lessons → assessments.
  - Use existing `topic_mastery` as the seed rather than creating a second competing mastery system.
  - Progress (2026-08-25): `src/lib/mastery/graph.ts` already implements mastery/confidence/recency-decay/misconception/prerequisite-weighted scoring — but its one live caller (`/api/study-plan`) was silently discarding real `topic_mastery.attempts`/`last_attempted` data (hardcoded `evidenceCount: 1`, no `lastSeenAt`), flattening recency/confidence scoring for every topic uniformly. Fixed — see `docs/BLUEPRINT_GAP_MATRIX.md`'s 2026-08-25 update. Still missing: no `prerequisite`/`related` topic edges exist anywhere (graph always gets an empty edge list), so the ranking's prerequisite-pressure term is currently inert. That's the next real increment here, not a re-wire.
  - Investigated (2026-08-27) why prerequisite edges aren't a quick follow-up fix, to save a future session from re-discovering this: real prerequisite data *does* exist — `src/lib/curriculum/cambridge.ts`'s `CurriculumTopic[]` has a populated `prerequisites: string[]` field referencing other topic IDs (e.g. `cambridge-math-2` → `["cambridge-math-1"]`) — but only for one subject/syllabus (Cambridge Mathematics IGCSE, 8 topics), and it's keyed by structured topic IDs. `topic_mastery.topic` (confirmed via `src/lib/studyspace/updateTopicMastery.ts`) is **freeform text** — whatever `evidence.topic` happens to be from a StudySpace session, with no constraint that it matches any curriculum catalog entry. Building real edges means either (a) a topic-normalization/matching layer mapping freeform mastery topics onto canonical curriculum topic IDs — real design work, not a quick fix, and a naive/fuzzy version risks silently wrong prerequisite attributions — or (b) constraining `evidence.topic` at the point of capture to canonical curriculum topic IDs going forward, which is a StudySpace-side decision, not a mastery-graph one. Also confirmed via direct query: `topic_mastery` has **zero rows in production** right now, so there's no live data being mis-served by the current empty-edges state — no urgency forcing a rushed version. Did not attempt a fuzzy-match hack; that would trade a correctly-inert feature for an incorrectly-active one.
  - **Needs a founder decision, not an engineering one:** full tradeoff writeup at `docs/decisions/ADR-2026-08-28-002-topic-canonicalization.md` — canonicalize topic capture at the source (StudySpace picks from a real curriculum list, UX change, needs catalog coverage beyond one subject) vs. best-effort confidence-scored matching at read time (no UX change, permanently probabilistic, real misattribution risk for a product where wrong "study X before Y" advice wastes exam-prep time). Blocked here until that call is made.

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

- [x] 🔴 **Tertiary Academic Model — discovery/specification first**
  - Define the minimum generic model for institution → qualification/program → course/module → semester/term → assessment.
  - Audit current `profiles`, `subjects`, `exams`, `study_topics` and onboarding data before adding anything.
  - Deliver a written model and gap list before implementation.

- [x] 🔴 **Assessment Intelligence — curriculum/past-paper audit**
  - Audit current Exam Hub ingestion, past-paper metadata and syllabus mappings.
  - Define canonical question/topic/assessment entities before building prediction features.

- [x] 🔴 **Offline Sync Architecture Audit**
  - Inventory current offline/PWA behavior, caching, persistence and mutation paths.
  - Produce a sync contract before implementing P2P or deeper offline functionality.
  - Delivered: `docs/audits/2026-08-24-offline-sync-architecture-audit.md`. Full inventory of 8 offline/PWA components across 4 IndexedDB databases. Key finding: 4 independent write/sync mechanisms, 2 of which (progress sync, task/subject sync) overlap or duplicate for the same entities without coordinating; a complete encrypted local-first/multi-device sync system (`src/lib/local-first/*`, 620 lines) exists but is unreachable — zero navigation links to `/sync`. Dead legacy `localStorage` write-queue in `src/lib/offline/index.ts` removed (zero callers). Remaining findings need a product decision, not further unilateral engineering — see doc §5 for the proposed sync contract.

- [x] 🔴 **Security Audit**
  - Review auth, RLS, API routes, service-role usage, uploads, secrets and AI-provider boundaries.
  - Delivered: `docs/audits/2026-08-24-security-audit.md`. Classified all 67 API routes by auth pattern; ran `Supabase:get_advisors` against the live DB and manually verified every flagged `SECURITY DEFINER` function's actual body (all correct — linter can't see into function logic). Two real issues found and fixed: `/api/generate-revision` had zero auth and called OpenAI directly bypassing the shared `callAI` cost/fallback gateway (unlimited unattributed AI spend, IP-rate-limited only); `/api/user/complete-tour` accepted a client-supplied `userId` with no auth (IDOR shape, currently inert). Both fixed with the codebase's established Bearer-token session pattern. Remaining findings (unused RLS-locked tables, two unauthenticated dead stub routes, disabled leaked-password-protection, timing-unsafe admin token comparison) need a product/ops call, not further unilateral engineering — see doc §5 for the full disposition table.

- [x] 🔴 **Production outage response (2026-08-24, unplanned)**
  - Two independent build-blocking bugs on `main` (`useNavBadges.ts` `Date.now().getTime()`, `/studyspace` missing Suspense boundary) had every deployment in `ERROR` state, including production. Fixed both directly on `main`, verified via a full local `next build`, confirmed `READY` on Vercel.
  - Discovered PR #230 (exam simulation redesign) was independently chasing the same two bugs; merged current `main` into it, resolved the one resulting conflict, verified, and merged the completed `ExamWorkspace` redesign into `main`. See `DEVLOG.md` for full detail.

- [x] 🔴 **Product Observability Audit**
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

- [x] 🟡 **Scheduling Engine (Mission Control Ch.8) — finish wiring dormant infrastructure**
  - Shipped 2026-08-13 (Claude, in-chat session). `study_plans` table created directly on the live Supabase project (`zczdtffwzkctkxwmvalb`) -- RLS enabled, `auth.uid() = user_id` policy matching the `exams`/`cortex_insights` convention. One active plan per student.
  - `src/app/api/study-plan/route.ts` (new): `GET` returns the active plan or null; `POST` validates goals, computes real `topicHints.weak` from `topic_mastery` (mastery_score < 60, scoped to submitted subjects), calls the existing `generateStudyPlan()`, deactivates any prior plan, persists the new one.
  - `src/app/(app)/study-plan/page.tsx` (new): uses the already-built, previously zero-caller `StudyGoalInput.tsx` for goal capture (caught and fixed a self-duplication -- had briefly hand-rolled a second form before finding this one), hands off to the already-built `StudyPlanDisplay`.
  - `src/lib/navigation.ts`: added `studyPlan` nav item next to Timetable.
  - Deliberately not wired: `topicHints.fresh` (curriculum-coverage "new topic" hints). Investigated further 2026-08-13: the original note ("no per-subject board/level mapping exists") was only half the picture. A real, evidence-based board/level mapping *is* derivable -- `user_past_paper_state (user_id, paper_id) -> past_papers (syllabus_id, level) -> syllabi (subject, board, levels)` gives a genuine per-subject board/level signal for students who've engaged with Exam Hub, needing only one normalization (`syllabi.board` uses `"CAIE"`, `CurriculumBoard` expects `"Cambridge"`). The real blocker is upstream of that: `src/lib/curriculum/{zimsec,cambridge}.ts`'s topic catalogs are populated for exactly 3 subject/board/level combinations total (ZIMSEC Mathematics O-Level, ZIMSEC Shona O-Level, Cambridge Mathematics IGCSE) -- every other `getZIMSECCurriculum`/`getCambridgeCurriculum` call returns `topics: []` by design. Building the board-mapping pipeline now would mostly produce empty `missingTopics` for the large majority of subjects regardless of how well board/level is resolved, which the existing generic fallback already handles honestly. **Actual prerequisite for this task: populate more subject topic catalogs in `curriculum/{zimsec,cambridge}.ts` first** -- that's real syllabus-content work, not a schema or engineering blocker. Once a subject has real topic data, the board-mapping join above is ready to wire in an afternoon.
  - Verified: `tsc --noEmit` clean, full vitest suite green.

- [x] 🟡 **Insight History — most frequent pattern summary**
  - Shipped 2026-08-13. `src/lib/insights/patternSummary.ts` (new, pure, 6 tests): plain recurring-word count across a user's stored `cortex_insights` rows -- deliberately not an AI call or a claimed semantic pattern. Renders nothing unless there's real recurrence (3+ insights, a word in 2+ of them), rather than a misleading summary on thin data.
  - Wired into the existing `src/app/(app)/insights/history/page.tsx` as a `PatternSummaryBanner`. Page itself untouched otherwise.

---

## 🟡 Phase 2 — Social & Competition

- [x] 🟡 **Leaderboard Page**
  - Already built and wired in `src/app/(app)/leaderboard/page.tsx` and navigation. Marked complete to prevent duplicate implementations.

- [x] 🟡 **Goals System**
  - Shipped 2026-08-13. `profiles.weekly_goal_minutes` added (live migration). Progress computed from `focus_sessions.duration_minutes` -- which required its own fix first, see Streak item below.
  - `src/lib/goals.ts` (new, pure, 11 tests): Monday-start week boundary, `computeGoalProgress()`, input validation.
  - `src/app/api/goals/route.ts` (new), `src/components/GoalTracker.tsx` (new), wired into `DashboardReimagined.tsx`.
  - Cortex mention: added a rule to the existing `resolveDeterministicInsight()` engine (`runtime/templates.ts`) and a goal-progress line to `buildBehaviorSummary()` for the Gemini path -- rather than building a parallel insight generator. Labeled "focused study time" throughout, not "study time" in general, since it only measures what's actually logged.

- [x] 🟡 **Streak Display Improvements**
  - Shipped 2026-08-13. `src/lib/streaks.ts` (new, pure, 14 tests): ISO week keys, a new one-freeze-per-week mechanic (abuse case handled: freeze only forgives a gap of exactly one missed day, only once per ISO week, never a larger gap). `cortex_memory.streak_freeze_week` added (live migration).
  - **Found and fixed a real production bug**: `src/lib/cortex/core.ts` called `trackStudySession()` (writes `lastStudyDate = now`) *before* `updateStreak()`, so `updateStreak`'s own fresh read of `lastStudyDate` was always "today" -- meaning the streak counter could never actually increment through the live Cortex "learn" path. Reordered the two calls. Predates this session.
  - `src/components/StreakDisplay.tsx` (new): flame icon, count, weekly freeze badge, replacing the old subtle `Metric` tile on the dashboard.
  - **Also found and fixed**: `focus_sessions` table existed in the live DB with full RLS but had zero writers anywhere in the codebase -- the Focus timer computed session length in-memory and discarded it. Wired the missing insert in `src/app/(app)/focus/page.tsx`; this is also what makes Goals System's progress real instead of empty.
  - **Unscoped fix found along the way**: `src/app/api/insights/generate/route.js` always inserted the identical hardcoded sentence regardless of any real data, and had zero callers anywhere in the app -- sitting unused next to the real `resolveDeterministicInsight()` engine. Converted to `route.ts`, rewired to build a real snapshot and call that engine instead.
  - Verified: `tsc --noEmit` clean, full suite green (137 passed).

---

## 🟢 Phase 3 — Polish & Experience

- [x] 🟢 **Subject Progress Visualization**
  - Already built and live -- not a gap. `DashboardReimagined.tsx`'s "Subjects in motion" section renders `SubjectTile` components (circular progress ring, subject name, completed/total lessons, percentage) sourced from `data.progress.subjects`, i.e. `ProgressService.getSubjectProgress()` computing this from `study_topics`/`subjects`. Verified by reading the live component, not assumed.

- [~] 🟢 **Dashboard Redesign**
  - Reliability track (loading/error/empty states, timeout handling) already shipped. Two additional passes done 2026-08-13 on direct owner request:
    - Motion/micro-interaction pass: framer-motion entrance choreography, animated count-up numbers (`src/components/ui/CountUp.tsx`, new), subject progress rings sweeping in on mount, ambient hero animation -- all respecting `prefers-reduced-motion`.
    - **Real bug fix, not a design opinion**: `DashboardReimagined.css` was the only file in the entire codebase using the `hsl(var(--token))` pattern, which requires tokens defined as bare HSL numbers -- but `globals.css` defines every token as hex/rgba, and `--border` isn't defined at all. `hsl(#7c8cff)` is invalid CSS and the browser silently drops it; this broke nearly every background/border/shadow declaration in the dashboard's own stylesheet, which is why it visually read as flat/monochrome despite a fully-designed accent system underneath. Converted every occurrence to `color-mix(in srgb, var(--X) N%, transparent)` or plain `var(--X)`, with `--border` mapped to the real `--card-border` token. No design values changed -- this restores color that was already coded but never rendering.
  - Remaining scope (IA consolidation, activity feed, badge progress) is explicitly ChatGPT's lane per `docs/AGENT_WORK_DIVISION.md` ("dashboard redesign and information architecture") and its "Dashboard rule" requiring an approved product direction before restructuring -- not attempted here for that reason, even under the owner's "improve it" request, which was scoped to motion/visual-correctness rather than structure.

- [x] 🟢 **Onboarding Flow**
  - Already built and wired, well beyond the original 3-step spec. Found and removed 6 fully-written, zero-import orphaned step components (older `Step<Name>.tsx` naming convention, 843 lines) left over from an earlier abandoned onboarding implementation. Removed 2026-08-07, verified via `tsc --noEmit`.

- [x] 🟢 **Audio Lessons — Tier 1**
  - Shipped, direct owner request. Browser-native narration + hands-free voice commands. Tier 2 (cloud TTS) deliberately deferred pending real Tier 1 usage.

- [x] 🟢 **Cortex Prompt Quality Improvement**
  - Shipped 2026-08-13. Real target found (`src/lib/cortex/prompts.js` doesn't exist -- the actual live Gemini insight prompt is `buildBehaviorPrompt()` in `src/lib/cortex/runtime/ai-gateway.ts`, confirmed wired via `Cortex.tsx` → `/api/cortex` `behavior.insight`).
  - The data summary (`buildBehaviorSummary()`) already included real subject names and task counts -- the prompt just never instructed the model to use them. Added an explicit instruction to name an actual subject/task count and an explicit anti-fabrication rule ("never invent a subject, task, number, or streak value not present in the data"), without changing the strict `{"insight":"..."}` output contract `extractInsightFromJson()` depends on.
  - Verified: `tsc --noEmit` clean, full suite green (137 passed).

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
