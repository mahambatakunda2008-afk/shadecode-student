# Shadecode Knowledge Governance

## Purpose

Shadecode uses code, blueprints, documents, prompts, audits, labs, research, task records, and agent handoffs as one evolving knowledge system. This document defines how those artifacts remain trustworthy and usable by humans and agents.

## Authority hierarchy

When sources disagree, resolve them in this order:

1. Explicit product-owner decision from Takunda.
2. Current production behavior verified from the repository and live systems.
3. Approved architecture and blueprint decisions.
4. Current implementation documentation and audits.
5. Agent plans, prompts, proposals, and experiments.
6. Historical notes and superseded documents.

A lower-level document must not silently override a higher-level decision.

## Artifact classes

- **Blueprint:** strategic design and intended evolution.
- **Architecture:** verified description of how the system is currently built.
- **Audit:** evidence-based assessment of current state, gaps, and risks.
- **Decision record:** durable record of a consequential choice and why it was made.
- **Prompt:** reusable instructions for an agent or workflow. Prompts do not override project authority.
- **Task:** bounded implementation work derived from higher-level requirements.
- **Lab:** experimental work that is not automatically production-approved.
- **Handoff:** exact operational state between agents or sessions.
- **Devlog/changelog:** chronological implementation history and release history.

## Blueprint governance

Every blueprint should identify:

- purpose and scope
- status: proposed, active, superseded, or archived
- owner/decision authority
- dependencies
- related documents
- implementation implications
- unresolved decisions
- last verification date

Blueprints describe direction. They do not prove that an implementation exists.

## Documentation freshness

Documents that describe current implementation must be verified against the repository before being treated as authoritative. When a document becomes stale, agents should update it rather than writing a contradictory parallel document.

Do not create duplicate reports merely because an existing document needs correction.

## Decision records

A consequential architectural, product, security, data, AI-provider, or workflow decision should be recorded with:

- decision
- context
- alternatives considered
- reason
- consequences
- affected artifacts
- date
- status

Reversals must preserve the old decision and explain what changed.

## Prompt governance

Prompts are executable policy for agents, not project truth. A prompt may reference blueprints, tasks, and architecture documents, but must not invent requirements that conflict with them. New broad prompts should normally be added to `prompts/` and linked from the knowledge map.

## Lab governance

Labs may contain speculative architecture, prototypes, experiments, and rejected approaches. Experimental code must not be treated as production behavior until explicitly promoted and verified. Promotion should record what was adopted, what was rejected, and what evidence justified the decision.

## Audit governance

Audits must distinguish:

- verified facts
- observed behavior
- unresolved hypotheses
- historical findings
- corrected findings

If an audit discovers that an earlier conclusion was stale or wrong, correct the current status and retain the correction history.

## Agent workflow

Before substantive work, an agent should read the coordination protocol, knowledge map, live handoff, relevant architecture, relevant blueprint(s), active task, and directly related audit/decision records.

After substantive work, the agent should update the appropriate task, documentation, decision record, devlog, and handoff state. Code-only changes are incomplete when documentation is part of the affected contract.

## Merge rule

A PR is not complete merely because its code builds. Before merge, the responsible agent should verify scope, review the diff, check applicable CI/tests, ensure documentation and handoff state are coherent, and confirm that no unresolved blocker is being hidden by the PR.

Routine safe PRs may be merged by the working agent. Product-owner decisions and high-risk irreversible changes remain escalated.

## Canonical navigation

The knowledge map is the entry point. The coordination protocol governs agent behavior. The live handoff records current work state. Architecture documents describe verified implementation. Blueprints define strategic direction. Audits provide evidence. Prompts operationalize repeatable work. Git history records what actually changed.
