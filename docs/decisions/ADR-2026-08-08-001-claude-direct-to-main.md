# Shadecode Decision Record

**ID:** ADR-2026-08-08-001
**Status:** Accepted
**Date:** 2026-08-08
**Decision owner:** Takunda (project owner)

## Decision

Claude (this agent) commits and pushes directly to `main` for its own work. This is an explicit, deliberate exception to `AGENT_COORDINATION_PROTOCOL.md` §6 ("Never push directly to `main`... use a dedicated branch per coherent change... prefer small, reviewable PRs") for this agent specifically.

## Context

`AGENT_COORDINATION_PROTOCOL.md` and the surrounding multi-agent coordination docs landed on `main` (commits `54af471`, `f4ffb2a`) while Claude was mid-session on Blueprint Reconciliation work. Their §6 directly contradicts the standing owner instruction Claude was already operating under: push directly to `main` for Claude-initiated fixes, no PRs unless the owner specifies otherwise. Rather than silently pick one, Claude stopped and surfaced the conflict directly to the owner (per §4 and §16 of the protocol itself: record contradictions, don't guess). Owner responded: "commit directly if it saves tokens and work."

## Alternatives considered

1. Silently continue direct-to-main as before, ignoring the new protocol. Rejected -- the protocol is a real, deliberate, freshly-recorded owner decision (per its own §4 authority order) and ignoring it without checking would be presumptuous.
2. Silently switch to branch+PR workflow to comply with §6. Rejected without confirmation -- would cost meaningfully more tokens/turns per change (branch creation, PR body, no auto-merge without a review step) for a solo-owner project where Claude's PAT is scoped to Contents read/write only (no Pull Requests permission -- confirmed during the session's engineering-hardening phase when closing PRs #81-83 failed with "Resource not accessible").
3. Ask and wait for an explicit answer before continuing. This is what happened -- owner confirmed direct-to-main is preferred for this agent.

## Why this decision

Owner explicitly values token/turn efficiency over PR review ceremony for Claude's own work specifically. This mirrors the pre-existing standing instruction, so the net effect is: the new coordination protocol's PR-based workflow is understood to primarily govern situations with genuinely concurrent/overlapping agent work (per §5's "One Active Owner Per Task" and the `agent-handoff.md` claim mechanism), not a blanket requirement that overrides a single agent's already-established, owner-approved working pattern.

## Consequences

### Positive
- No workflow disruption; Claude continues at the verification-before-push discipline already established this session (`tsc --noEmit`, `node --check`, full test suite) without added PR overhead.
- Codified so the next agent (or a future Claude session) doesn't hit the same ambiguity and re-ask.

### Negative / trade-offs
- Direct-to-main means no second-pair-of-eyes review gate before code reaches production for Claude's changes specifically -- mitigated by the verification discipline already in place (typecheck, tests, `node --check` before every push this session), not by process review.
- If a second agent (ChatGPT, Copilot, another Claude session) is genuinely working concurrently on overlapping files, direct pushes from two agents could still collide. `.cortex/agent-handoff.md`'s claim mechanism remains the mitigation for that case -- Claude checks it before starting substantial work, per protocol §2 and §11, regardless of this push-workflow exception.

## Affected artifacts

- Blueprint(s): none
- Architecture: none
- Code: none directly -- this is a process decision
- Database: none
- Prompt(s): `AGENT_COORDINATION_PROTOCOL.md` §6 (exception recorded here, not edited in place, to preserve the original protocol text for other agents it does apply to)
- Lab(s): none
- Task(s): none

## Verification

Claude continues pushing directly to `main` for its own commits; this record is the reference if that's ever questioned. Cortex Engine's own PR-based workflow (`.cortex/cortex-engine.js`) is unaffected -- this decision applies to Claude-driven work only, not the autonomous Cortex Engine, which still opens PRs per its existing design.

## Supersession / reversal

If the owner later wants Claude on a PR-based workflow too (e.g. once genuinely concurrent multi-agent work becomes common), record that as a new decision here rather than editing this one.
