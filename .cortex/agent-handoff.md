# Active Agent Handoff

**Status:** READY
**Last updated:** 2026-08-08
**Current active agent:** None
**Next agent:** Any authorized Shadecode agent

## Current Project State

Claude is mid-way through Blueprint Reconciliation (see `docs/BLUEPRINT_GAP_MATRIX.md`) and the `DASHBOARD_REDESIGN_SPEC.md` implementation track (§15 handoff).

1. **Retention Risk** (Mission Control Ch.7) -- fully shipped.
2. **Scheduling Engine** (Mission Control Ch.8) -- fabrication issue fixed, full wiring deferred with a documented plan.
3. **Dashboard reliability + repo-wide reliability sweep** -- shipped (dashboard, `exam-sim`, `math-checker`, `insights/history`). `tasks`/`curriculum` pages still have unbounded `Promise.all` on plain DB reads -- lower priority, documented, not yet fixed.
4. **Floating feedback widget** -- shipped. One open item: an RLS policy fix's anonymous-insert case couldn't be conclusively verified through SQL simulation tooling (see `DEVLOG.md`) -- low real-world stakes, worth a live check.
5. **Audio lessons Tier 1** -- shipped, direct owner request. Browser-native narration + hands-free voice commands on the lesson page. Full design record in `docs/AUDIO_LESSONS_SPEC.md`. Tier 2 (cloud TTS) deliberately deferred pending real usage of Tier 1.

No task is currently claimed/in-progress.

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
