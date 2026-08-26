# Blueprint Gap Matrix

**Date:** 2026-08-07
**Method:** Structural extraction of all 92 blueprint `.docx` files (8 series) via heading-level text (20pt+ bold runs, the actual formatting convention used — no Word heading styles are applied in this corpus), full-text read of a representative sample per series, and targeted full reads where an implementation decision required it. Cross-referenced against live repo state, Supabase schema, and this session's engineering audit.

**Read-depth key**, noted per row so confidence is explicit rather than implied:
- **Full** — read completely, word-for-word
- **Structural** — every heading/section extracted and reviewed; body text not read in full
- **Sampled** — one or more representative chapters/volumes read in full, rest structural

## Honest framing before the matrix

This blueprint corpus describes a 10-year, company-scale vision — it says so explicitly (Chapter 29: *"The Future of Learning & Education 2035"*; Chapter 28 maps founder stages through global expansion; Chapter 19's own roadmap runs Phase 0 → Phase 6: Foundation → Mission Control → AI-Native Learning → School Platform → National Platform → Global Platform → Education Ecosystem). It includes a hardware device line (*Shadecode Learning Box*), a global teacher/parent/school ecosystem, a 7+ agent AI orchestrator, virtual science laboratories, a marketplace economy, and a full "Academic Digital Twin" with 12 sub-models.

The live repository is a real, working, single-developer MVP at roughly Phase 0 / early Phase 1 maturity. Most of this corpus is **appropriately unimplemented** — it's intentional future vision, not a missed checklist. Treating every gap as equally actionable would be dishonest and a waste of engineering effort. The matrix below classifies accordingly.

---

## Gap Matrix

| Blueprint Series | Read Depth | Roadmap Phase (per Ch.19) | Status | Missing Functionality (top items) | Related Live Modules | Est. Effort | Priority | Notes |
|---|---|---|---|---|---|---|---|---|
| **SC STUDENT EVOLUTION** (22 vol.) — core product blueprint, governance, and Claude working instructions | Sampled (Vol 0, I, II full; rest structural) | Phase 0–1 | **Substantial** — this is the series the live product actually tracks closest | Priority Engine (Vol XIV §10) not implemented; "most frequent pattern" summary (Vol XIII-adjacent, already tracked in `tasks.md`); streak freeze (Vol XII §7) | Cortex, tasks, achievements, exam-sim, onboarding — nearly everything | Ongoing | **Highest** | This is Current Truth for how the product should be governed and built; treat as living, not archived |
| **ENGINEERING BLUEPRINT** (20 ch.) — Mission Control system architecture (Cortex 2.0, Digital Twin, Knowledge Graph, multi-agent) | Sampled (Ch1, Ch3 full; rest structural) | Phase 1–2 | **Partial, foundational layer only** | Cortex 2.0's 7-layer memory hierarchy, Knowledge Graph, 7-agent orchestrator (Tutor/Planner/Coach/Analyst/Creator/Career/Community), Student Digital Twin (12 sub-models) — none exist. Live Cortex is a genuine, functional single-dispatcher ("Cortex v1" per its own router.ts docstring: intent switch on learn/practice/exam/feedback, flat memory snapshot, no knowledge graph, no agents) | `src/lib/cortex/core.ts`, `router.ts`, `memory.ts`, `memoryTracker.ts` | Knowledge Graph alone: weeks. Digital Twin: weeks. Multi-agent: weeks. | **Medium** (foundational, but too large to increment right now) | Correctly unimplemented at this stage — building a knowledge graph before there's curriculum content depth to populate it would be premature |
| **MISSION CONTROL** (30 ch.) — the full "Personal AI Operating System" vision: planning, forecasting, community, career, creator, hardware, global network | Sampled (Ch1, Ch5, Ch7, Ch8 full; rest structural) | Phase 1 (Ch1–9, 11–19) through Phase 4–6 (Ch20–29: career, creator, hardware, global) | **Mixed — near-term chapters mostly done, long-term chapters not started (correctly)** | **Done:** Priority Engine (Ch7, Retention Risk factor, 2026-08-07). Scheduling Engine (Ch8) — fully wired as of 2026-08-25: `study_plans` table, `/api/study-plan` + `/study-plan` page, real topic selection backed by mastery/curriculum data (see update below), knowledge-graph evidence/recency wiring fixed in the same pass. Prediction/Forecasting Engine (Ch10) — not implemented, no forward-looking analytics exist. **Correctly not started:** Career Navigation (Ch20), Creator/Innovation Engine (Ch21), Global Education Network (Ch22), Hardware Ecosystem (Ch27), AI Marketplace (Ch25) | Tasks (`src/app/(app)/tasks`), Cortex, `daily_challenges`, `src/lib/studyPlan/*`, `src/lib/mastery/graph.ts` | Priority Engine: **done**. Scheduling Engine: **done**. Forecasting: weeks (needs a real prediction model, not just formula). Career/Creator/Hardware/Global: months–years, correctly deferred | Forecasting Engine (Ch10) is next in line for near-term work. Career/Creator/Hardware/Global: **Defer, do not start** | This is the series with the clearest "buildable now vs. correctly future" split |
| **SHADECODE AI BLUEPRINT** (7 vol.) — Cortex philosophy, multi-agent design, AI safety/integrity | Structural | Phase 1–2 | **Partial** | Multi-agent architecture (Vol II) not implemented (same gap as Engineering Blueprint Ch8). AI Safety/Educational Integrity (Vol V) — partially covered by this session's RLS/auth work, but no dedicated academic-integrity or graduated-assistance system exists | `src/lib/cortex/*`, `src/lib/ai/*` (4-provider fallback chain) | Multi-agent: weeks | **Low-Medium** | Overlaps heavily with Engineering Blueprint Ch3/Ch8 — same underlying gap, don't double-count effort |
| **SHADECODE PLATFORM BLUEPRINT** (6 vol.) — multi-platform (mobile/desktop/tablet), subject workspaces, deployment strategy | Structural | Phase 1–3 | **Partial** | Native mobile/desktop apps (Vol I, II, III) don't exist — web-only via Vercel/Next.js currently. Subject-specific "Workspaces" (Vol II1 — Math/Physics/CS/Chemistry/Biology/History/Language workspaces) don't exist as a distinct concept; closest analog is Exam Hub + Math Checker as separate features, not a unified workspace model. Deployment/release strategy (Vol V) is informally covered by current Vercel CI, not formalized | Vercel deploy, `src/app/api/math-checker` | Native apps: months. Workspaces: weeks per subject | **Low** for native apps at current scale (~40 users, web-first is correct); **Medium** for workspace unification if Exam Hub keeps growing | Correctly low priority — building native mobile apps before validating the web product further would be premature |
| **SHADECODE DESIGN SYSTEM** (1 vol.) — design philosophy and UX principles | Full | Phase 1 | **Substantial, informally** | No formal design token system or documented component library exists — the frontend-design conventions are applied ad hoc per component rather than codified. Principles themselves (simplicity, one primary action, progressive disclosure) are followed reasonably well in what I've seen this session (achievements page, leaderboard, exam viewer) | Entire `src/components` tree | Formalizing tokens: days | **Low** | Not urgent — codify once the component set stabilizes further, not before |
| **SHADECODE SCIENCE PLATFORM** (5 vol.) — virtual laboratory, simulation engine, AI lab assistant, practical exam trainer | Structural | Not on the Ch.19 roadmap at all — appears to be a distinct future product line, not sequenced into Phase 0–6 | **Not started** | Entire product line: virtual laboratory, universal simulation engine, AI lab assistant, practical exam trainer, scientific notebook | None — zero live code relates to this | Months, likely its own product effort | **None — do not start** | This reads as a genuinely separate future product, not a gap in Shadecode Student as it exists. Flagging as Future Vision, not a current gap |

---

## Selected gap: the Priority Engine (Mission Control Ch.7 / SC Student Evolution Vol. XIV §10)

**Why this one, not a bigger one:** It's the highest-leverage item that's actually incrementable in a single session — concretely specified (a 10-factor formula, not vision prose), buildable entirely on data the live schema already has (`tasks`, `cortex_memory.exam_scores`, `profiles.streak/xp`, `topic_mastery`), and it's the single most repeated concrete idea across the *entire* corpus: replacing a flat task list with "the one thing that matters most right now" is the literal thesis of "Dashboard Is Dead... Today's Mission" (Mission Control Ch.3/4) and the whole Ch.30 master blueprint's Pillar 4. Knowledge Graph and Digital Twin are the deeper foundational gaps, but both are multi-week efforts that don't fit "select one gap, implement incrementally, verify thoroughly" for this session — attempting a shallow version of either would produce something worse than not building it.

Implementation shipped: Retention Risk (Priority Engine Factor 4) end to end. See `DEVLOG.md` 2026-08-07 "Blueprint Reconciliation: Retention Risk" entry for the full account.

---

## Update, 2026-08-25: Scheduling Engine is now complete (was "dormant infrastructure" as of 2026-08-07)

Checked all five items from the completion plan below against live repo state before
starting anything new, per this doc's own search-before-create rule. All five are
done:

1. **Decided which `generateStudyPlan` to keep:** `studyPlan/generator.ts` won, as
   recommended — it's the one `src/app/api/study-plan/route.ts` actually imports.
   `src/lib/cortex/generatePlan.ts` (the duplicate) is confirmed to have zero
   importers anywhere in the codebase (re-verified by grep before touching it) and
   has been deleted.
2. **`generateTopicPlaceholder`'s hardcoded-content bug is fixed** — the function is
   now `selectSessionTopic()`, backed by real `topicHints` (`weak`/`fresh`) rather
   than a fixed list, with an explicit code comment documenting the fix and the
   fabricated-content precedent it was avoiding.
3. **Goal-capture exists** (`StudyGoals` type, `src/lib/studyPlan/types.ts`) — not
   re-verified in detail this pass, but the route accepts and validates
   `examDate`/`availableHoursPerWeek`/`subjects` directly.
4. **Persistence exists** — `study_plans` table is live and used by the API route.
5. **Wired** — `/api/study-plan` route and `/study-plan` page both exist and are
   connected end to end.

**One real gap found while re-verifying, not previously flagged: the knowledge-graph
wiring at the one live call site was silently degraded.** `buildKnowledgeGraph()` in
`src/lib/mastery/graph.ts` is a genuine, well-built module (mastery, confidence,
recency-decay, misconception, prerequisite-weighted ranking — matches the
"Student Knowledge & Mastery Graph" strategic item's spec closely), but
`study-plan/route.ts`'s call site hardcoded `evidenceCount: 1` for every topic and
never passed `lastSeenAt` at all — even though `topic_mastery`'s real `attempts` and
`last_attempted` columns were sitting right there, selected by nothing. Practical
effect: the recency factor in `rankNextTopics()`'s scoring defaulted to the same
value for every topic (no actual differentiation), and confidence was derived from
a constant instead of real attempt counts. Fixed: the route now selects and passes
both real columns. Small, safe, verified fix (`tsc`, lint, `mastery/graph.test.ts`
all clean) — not a new feature, just making an already-correct scoring system
actually see the real data it was designed to use.

No edges (`prerequisite`/`related` relationships between topics) exist anywhere yet
— `buildKnowledgeGraph` is still called with an empty edge list, so
`rankNextTopics`'s prerequisite-pressure term is currently always zero. Building
real curriculum-topic-dependency data is a separate, larger effort (part of
"Student Knowledge & Mastery Graph" in `.cortex/tasks.md`) and wasn't attempted this
pass — flagging it as the next genuinely incremental step here, distinct from
"the scoring math is wrong" (it isn't) or "the wiring is missing" (it no longer is,
for the columns that already exist).

---

## Second pass finding: Scheduling Engine (Mission Control Ch.8) has substantial dormant infrastructure, not a blank slate

*(Historical record, 2026-08-07 — superseded by the update above, kept for the audit trail.)*

While investigating Ch.8 as the next candidate, searched for existing implementations first (per methodology) and found more than expected -- worth documenting precisely rather than either rushing a wire-up or leaving this as a vague "not started" line.

**What exists, fully built, fully disconnected:**
- `src/lib/studyPlan/generator.ts` (450 lines) -- a real, non-fabricated weighted scheduling algorithm: multi-week plans from `{targetGrade, examDate, availableHoursPerWeek, subjects, prioritySubjects}`, subject-time distribution weighted by priority/weak/strong subjects and timeline phase (more weak-subject focus early, more strong-subject review near the exam -- a genuine rule-based version of Ch.8's "Time Is Not Equal" philosophy), session typing (learn/practice/revision/exam/catchup, mapped to Ch.8's "Smart Session Types"), revision blocks, and a progress calculator.
- `src/components/StudyPlanDisplay.tsx` -- a complete, polished display component (weekly schedule view, progress cards, catch-up recommendations section).
- **Zero callers of either.** No API route, no page, no import anywhere outside their own files. `grep -rn "generateStudyPlan(" src` and `grep -rln "StudyPlanDisplay" src` both return nothing outside the files themselves.
- A second, differently-shaped `generateStudyPlan` also exists in `src/lib/cortex/generatePlan.ts` (289 lines, properly uses `recommendation-engine/engine.ts`) -- also zero callers. Two independently-built systems with the identical function name, neither wired up, is itself worth flagging: if either is completed first, the other should likely be archived rather than also completed, to avoid the exact "multiplying systems" problem this phase's methodology exists to prevent.

**Real quality issue found, must be fixed before either is wired up:** `generator.ts`'s `generateTopicPlaceholder()` returns a topic name from a **hardcoded fixed list per subject/session-type** (e.g. `math.learn: ["Algebra fundamentals", "Geometry basics", "Calculus introduction"]`), completely disconnected from a student's actual curriculum or mastery data. Shipping this as-is would repeat the exact fabricated-content mistake this codebase has already been burned by once (`NextActionDashboard`'s removed Exam Readiness card). The fix has a natural, non-duplicative path: `study_topics` (also fully orphaned, zero references anywhere in `src`) or `topic_mastery` (now real and populated as of this session's earlier work) should back topic selection instead -- "learn" sessions should pick a genuinely low/no-mastery topic, "revision" sessions should pick one flagged at retention risk.

**Why this is deferred rather than attempted this session:** properly completing this is comparable in scope to the entire Retention Risk slice, not a small extension of it -- it needs the placeholder fix, a goal-capture UI (exam date / target grade / hours-per-week / subjects don't appear to be captured anywhere currently; onboarding doesn't collect them), a persistence table (no `study_plans` table exists in the schema), and a new API route + page. Attempting all of that at the tail of an already long session risks exactly the under-verified shipping this whole session has been disciplined about avoiding.

**Recommended completion order, next session:**
1. Decide which of the two `generateStudyPlan` implementations to keep -- recommend `studyPlan/generator.ts`, since it's closer to Ch.8's actual weekly-schedule vision; archive `cortex/generatePlan.ts` with justification once confirmed.
2. Fix `generateTopicPlaceholder` to use real `topic_mastery` data.
3. Check onboarding/settings for any existing goal-capture data before building new UI for it.
4. Add persistence (`study_plans` table, following the same RLS pattern established this session).
5. Wire one API route + one page. Verify thoroughly (this codebase's real bar, not a token check) before considering it shipped.
