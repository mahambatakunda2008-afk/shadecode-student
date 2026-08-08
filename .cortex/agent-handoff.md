# Active Agent Handoff

**Status:** READY
**Last updated:** 2026-08-08
**Current active agent:** None
**Next agent:** Any authorized Shadecode agent

## Current Project State

Claude is mid-way through Blueprint Reconciliation (see `docs/BLUEPRINT_GAP_MATRIX.md`). Two gaps addressed so far:

1. **Retention Risk** (Mission Control Ch.7, Priority Engine Factor 4) -- fully shipped. `topic_mastery` now has both a producer (`exam/mark/route.js`) and a consumer (`weakAreas.ts` → `recommendation-engine/engine.ts`'s new `retention_risk` factor).
2. **Scheduling Engine** (Mission Control Ch.8) -- investigation done, fabrication issue fixed, full wiring deferred. `studyPlan/generator.ts` (450 lines) is real and now free of hardcoded fake topic content, but still has zero callers -- no goal-capture UI, no persistence table, no API route, no page. `cortex/generatePlan.ts` archived in place (duplicate, unused). Precise completion plan is in `docs/BLUEPRINT_GAP_MATRIX.md`'s "Second pass finding" section and `.cortex/tasks.md`.

No task is currently claimed/in-progress -- both of the above are either shipped or cleanly paused with a documented next step, not mid-edit.

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
