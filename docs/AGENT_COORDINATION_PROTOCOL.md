# Shadecode Agent Coordination Protocol

**Status:** Active
**Owner:** Shadecode project owner
**Applies to:** ChatGPT, Claude, Copilot, Cortex, and any future development/research agent

## 1. Purpose

This document defines how multiple agents work on Shadecode without losing context, duplicating work, contradicting project decisions, or damaging existing systems.

The repository is the implementation source of truth. The Shadecode documentation and blueprint system is the strategic source of truth. Neither an individual agent nor a single chat session outranks the project record.

## 2. Before Any Agent Starts

An agent must establish the current state before changing anything:

1. Read `README.md`.
2. Read the relevant current audit/architecture documents in `docs/`.
3. Read the applicable blueprint and blueprint-gap material if the task is strategic or architectural.
4. Read `.cortex/tasks.md` and inspect open PRs/issues relevant to the task.
5. Read `.cortex/agent-handoff.md` if it exists.
6. Inspect the actual implementation before trusting documentation claims.
7. Check current branch/PR/CI state.
8. Identify whether the requested work is production, experimental/Lab, documentation, research, or infrastructure.

Never assume an older prompt is more authoritative than the current repository.

## 3. Work Classification

Every piece of work must belong to one or more of these tracks:

- **VISION:** long-range Shadecode direction.
- **BLUEPRINT:** strategic architecture and product design.
- **DOCUMENTATION:** specifications, audits, records, guides, and decisions.
- **PROMPT:** reusable instructions for agents or AI systems.
- **PRODUCT:** production application code and user-facing functionality.
- **LAB:** experimental/prototype work not yet approved for production.
- **CORTEX:** autonomous intelligence/agent infrastructure.
- **INFRASTRUCTURE:** CI, deployment, security, observability, tooling.
- **RESEARCH:** investigation whose findings may inform later decisions.

Do not silently promote Lab or Research work into production.

## 4. Authority Order

When sources disagree, resolve them in this order:

1. Explicit owner decision recorded in the repository.
2. Current approved architecture/blueprint decision.
3. Current task/issue acceptance criteria.
4. Current production code and tests, when describing what actually exists.
5. Current audit findings.
6. Current prompts/instructions.
7. Older documentation, chats, or generated plans.

If a contradiction cannot be resolved safely, stop and record the conflict instead of guessing.

## 5. One Active Owner Per Task

A task may have multiple contributors, but only one agent owns the active implementation at a time.

The active owner must record:

- task identifier/title;
- scope;
- files being changed;
- branch/PR;
- decisions made;
- tests run;
- known failures;
- next action.

Another agent may review, investigate, or prepare follow-up work, but must not unknowingly modify the same scope.

## 6. Git and PR Rules

- Never push directly to `main` for normal development work.
- Use a dedicated branch per coherent change.
- Prefer small, reviewable PRs.
- Do not overwrite another agent's branch.
- Rebase/merge only when it is safe and understood.
- Every PR must explain what changed, why, verification performed, and remaining risks.
- A PR is not considered complete until CI and human/project-owner review requirements are satisfied.

## 7. Documentation Is Part of the Change

If implementation changes an architectural assumption, workflow, public behavior, or important project decision, update the relevant documentation in the same workstream.

Do not create duplicate documentation merely because an existing document was inconvenient to find. Prefer updating or indexing existing material.

## 8. Blueprint Rules

Blueprints describe intended direction, not permission to break working software.

Before implementing a blueprint item:

- identify the exact blueprint/volume/section;
- identify dependencies;
- verify current implementation;
- identify conflicts with existing product behavior;
- convert the approved portion into an actionable task.

If implementation reveals that a blueprint is obsolete, update the blueprint or record a decision rather than silently diverging from it.

## 9. Prompt Rules

Prompts are project assets. Reusable prompts must be stored in the repository or referenced by a documented registry.

A prompt must state, where relevant:

- role;
- objective;
- authoritative sources;
- constraints;
- prohibited actions;
- expected output;
- verification requirements;
- handoff requirements.

Do not rely on a prompt existing only in a chat transcript when it is important to project continuity.

## 10. Agent Handoffs

A handoff occurs whenever:

- an agent reaches a usage/context limit;
- the user switches agents;
- work is paused;
- a task changes owner;
- an agent cannot safely continue;
- a PR is awaiting review;
- a decision is needed from the owner.

Before stopping, the active agent updates `.cortex/agent-handoff.md` using `docs/AGENT_HANDOFF_TEMPLATE.md`.

The handoff must describe reality, not intentions.

## 11. Handoff Protocol

The receiving agent must:

1. Read the handoff.
2. Verify important claims against GitHub/code/docs.
3. Inspect the active branch/PR.
4. Continue only from verified state.
5. Update the handoff when taking ownership.
6. Preserve unresolved questions instead of silently deleting them.

## 12. Claude ↔ ChatGPT Switching

Claude and ChatGPT are peers in this workflow.

Neither should treat the other as an authority. Both must follow this protocol and the same repository state.

When switching:

`agent A -> update handoff -> commit/PR -> agent B verifies -> agent B continues`

The user's role is owner/reviewer, not the message bus. The repository should carry the context wherever possible.

## 13. Cortex Rules

Cortex is an autonomous implementation agent, not the final authority.

Cortex must:

- follow `.cortex/tasks.md`;
- operate within its declared scope;
- open PRs rather than bypass review;
- update its devlog;
- never modify protected architecture/schema merely because an AI suggests it;
- leave machine-readable handoff state when a cycle is interrupted or incomplete.

Autonomy never removes review requirements.

## 14. Verification Gate

Before declaring implementation complete, verify as appropriate:

- typecheck;
- lint;
- unit/integration tests;
- production build;
- affected API behavior;
- affected UI behavior;
- authentication/authorization boundaries;
- database assumptions;
- offline/PWA behavior when relevant;
- CI status;
- documentation consistency.

Do not claim a check passed if it was not actually run.

## 15. Security

Agents must never commit secrets, API keys, PATs, service-role keys, or private credentials.

Temporary GitHub credentials should be short-lived and minimally scoped. A credential supplied for agent work must never be copied into repository files, prompts, logs, issues, PR bodies, or documentation.

## 16. Failure and Uncertainty

When blocked, an agent must record:

- exact blocker;
- evidence;
- attempted fixes;
- what remains unknown;
- safest next step.

Do not fabricate completion to keep a task moving.

## 17. Definition of Done

A task is done only when:

- implementation matches the approved scope;
- relevant tests/checks pass or exceptions are explicitly recorded;
- documentation is synchronized where required;
- the PR is reviewable;
- handoff state is updated;
- no known unrelated regression has been introduced.

## 18. Principle

**The agent may change the system. The record must explain the change. The next agent must be able to continue without needing the previous conversation.**
