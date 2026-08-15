# Active Agent Handoff

**Status:** READY
**Last updated:** 2026-08-13
**Current active agent:** None
**Next agent:** Any authorized Shadecode agent (or Takunda)

## Current Project State

`.cortex/tasks.md` Phases 1, 2, and 3 (Claude-scoped items) are now fully closed.

1. **Retention Risk** (Mission Control Ch.7) -- fully shipped.
2. **Scheduling Engine** (Mission Control Ch.8) -- fully wired end to end. `topicHints.fresh` (curriculum-based) deliberately still not wired -- no per-subject exam-board/level data exists in the schema to back it honestly.
3. **Insight History pattern summary** -- shipped: `src/lib/insights/patternSummary.ts`, wired into `insights/history`.
4. **Goals System** -- shipped: `src/lib/goals.ts`, `src/app/api/goals/route.ts`, `src/components/GoalTracker.tsx`, `profiles.weekly_goal_minutes` (live).
5. **Streak Display Improvements** -- shipped: `src/lib/streaks.ts` (freeze mechanic), `src/components/StreakDisplay.tsx`, `cortex_memory.streak_freeze_week` (live).
6. **Subject Progress Visualization** -- confirmed already built and live (`SubjectTile` in `DashboardReimagined.tsx`); no new work needed.
7. **Cortex Prompt Quality Improvement** -- shipped: `buildBehaviorPrompt()` in `runtime/ai-gateway.ts` now explicitly requires referencing real subject names/task counts and forbids inventing data.
8. **Dashboard Redesign** -- reliability half shipped earlier; remaining IA/consolidation scope is explicitly ChatGPT's lane per `docs/AGENT_WORK_DIVISION.md`, not attempted.
9. **Three production bugs found and fixed this session** (all pre-existing, not introduced by this session's other work):
   - `updateStreak()` was called *after* `trackStudySession()` in `core.ts`, so the streak counter could never actually increment -- reordered.
   - `focus_sessions` had full RLS but zero writers anywhere in the repo -- the Focus timer discarded session duration instead of logging it; wired the missing insert. This is also what makes Goals System's progress real.
   - `/api/insights/generate` was a dead, hardcoded-sentence route with zero callers, sitting unused next to the real `resolveDeterministicInsight()` engine. Rewired to use that engine with a real snapshot; converted `.js` → `.ts`.
10. **Dashboard reliability + repo-wide reliability sweep** -- shipped (dashboard, `exam-sim`, `math-checker`, `insights/history`). `tasks`/`curriculum` pages still have unbounded `Promise.all` on plain DB reads -- lower priority, documented, not yet fixed.
11. **Floating feedback widget** -- shipped. One open item: an RLS policy fix's anonymous-insert case couldn't be conclusively verified through SQL simulation tooling -- low real-world stakes, worth a live check.
12. **Audio lessons Tier 1** -- shipped. Tier 2 (cloud TTS) deliberately deferred pending real usage of Tier 1.

**Known but not fixed:** three separate "snapshot/context" abstractions exist in the Cortex subsystem (`CortexSnapshot`, `IntelligenceContext`, and an inline shape in `generatePlan.ts`). Real consolidation opportunity, documented in `DEVLOG.md`'s 2026-08-13 entries, not attempted -- too large/risky as a side effect of feature work.

No task is currently claimed/in-progress. Nothing known to remain that's fabricated or dead code after this session's fixes.

## Required Starting Point

Before claiming work, read:

1. `README.md`
2. `docs/AGENT_COORDINATION_PROTOCOL.md`
3. `docs/AGENT_HANDOFF_TEMPLATE.md`
4. `docs/ARCHITECTURE.md`
5. the latest applicable audit documents in `docs/`
6. `docs/BLUEPRINT_GAP_MATRIX.md`
7. `.cortex/tasks.md`
8. relevant open PRs/issues

Then inspect the actual code affected by the proposed task.

## Important Rules

- Do not assume old chat prompts are current.
- Do not bypass existing blueprints, audits, or task constraints.
- Do not claim tests passed unless they were run.
- Do not put credentials in repository files.
- Use a dedicated branch and reviewable PR for implementation changes.
- Update this file before handing work to another agent.

**Exception:** Claude commits directly to `main` for its own work, per explicit owner decision -- see `docs/decisions/ADR-2026-08-08-001-claude-direct-to-main.md`. This does not apply to other agents unless the owner records the same exception for them.

## Current Ownership

No task is claimed. The next agent must explicitly claim a task and populate the handoff before beginning substantial implementation work.

## Open Questions

None recorded here. Task-specific questions belong in the active handoff state.
