# Shadecode Agent Work Division

## Purpose

This document defines how ChatGPT, Claude, Cortex, and the product owner divide work. It is a coordination contract, not a restriction on necessary implementation changes.

## Core principle

The repository and approved Shadecode knowledge artifacts are the shared source of truth. Agents do not own separate versions of Shadecode's architecture or product direction.

**ChatGPT is the product/UX and integration lead. Claude is the primary deep implementation/engineering lead. Cortex is an autonomous subsystem operating under the same governance. Takunda is the product owner and final authority for product-direction decisions.**

## ChatGPT responsibilities

ChatGPT leads or co-leads:

- user-facing UX and product experience
- dashboard redesign and information architecture
- navigation and user journeys
- responsive/mobile experience
- visual/product consistency
- product-level interpretation of blueprint requirements
- cross-system reconciliation
- architectural review from the product perspective
- PR review and routine safe merges
- final integration checks across work performed by multiple agents
- converting ambiguous user feedback into actionable engineering requirements

ChatGPT may modify code directly when the change is appropriate, but should not avoid implementation work merely because it is labelled frontend or backend.

## Claude responsibilities

Claude is the primary deep engineering implementer for:

- backend and API work
- Supabase/database changes
- authentication and authorization internals
- Cortex implementation and orchestration
- asynchronous workflows and provider integrations
- performance and reliability investigation
- CI/build/deployment failures
- broad refactors
- automated and integration testing
- security-hardening implementation
- complex cross-file engineering changes

Claude may change user-facing code whenever required by a technical fix. Such changes remain subject to the product/UX review gate.

## Cortex responsibilities

Cortex may autonomously propose or implement bounded work through the repository's governed workflow. Cortex work must:

- follow `AGENTS.md` and the coordination protocol
- respect architecture and knowledge governance
- produce a reviewable Git change
- never silently promote experimental work to production
- leave a useful handoff when stopping

Cortex-generated PRs are reviewed like any other agent change. Autonomy does not bypass review.

## Shared responsibilities

All agents may:

- inspect the repository
- inspect blueprints, audits, prompts, tasks, and handoffs
- diagnose bugs
- update documentation
- write tests
- propose architecture changes
- review another agent's work

When responsibilities overlap, the agent closest to the work should execute while the other acts as reviewer or integration partner.

## User-facing reliability rule

User feedback is treated as production evidence. Reports such as "a tab hangs forever" are not dismissed as cosmetic UX issues. The responsible engineering agent must investigate the complete request lifecycle, including client state, async operations, API routes, database calls, external providers, retries, timeouts, and error handling.

Every user-facing async operation should have an intentional terminal state: success, actionable failure, cancellation, or bounded timeout. A loading state must not become an accidental permanent state.

## Dashboard rule

The dashboard is treated as a product experience, not a collection of widgets. Redesign work must begin from the approved dashboard/product direction and current user evidence, then establish information hierarchy, primary actions, responsive behavior, accessibility, loading/error/empty states, and implementation details.

Do not replace the dashboard with a generic AI-generated dashboard aesthetic without reconciling it with Shadecode's design system and blueprint requirements.

## Handoff between ChatGPT and Claude

When handing work to Claude, ChatGPT should provide:

1. objective
2. user-facing problem or requirement
3. relevant blueprint/document references
4. current implementation state
5. exact files/systems likely involved
6. constraints and non-goals
7. acceptance criteria
8. tests/verification expected
9. unresolved questions

When Claude hands work back, it should provide the equivalent implementation state, including changed files, commits/PR, tests, known limitations, and recommended next action.

The live handoff remains the canonical session-to-session state.

## PR and merge protocol

The working agent should create a focused PR for substantive work. Before merge, the responsible reviewer checks:

- scope and diff
- architecture compatibility
- tests and CI
- deployment state when relevant
- documentation/handoff coherence
- security implications
- user-facing behavior when applicable

Routine safe PRs may be merged by ChatGPT without requiring Takunda to perform manual GitHub operations. High-risk irreversible changes, product-direction conflicts, destructive migrations, or other decisions explicitly requiring owner authority must be escalated.

## When Claude's limit is reached

Claude leaves the repository in a coherent state and updates the handoff. ChatGPT continues from the repository state, not from Claude's chat transcript alone.

## When ChatGPT's limit is reached

ChatGPT leaves the same kind of durable handoff. Claude continues from repository state and documented decisions rather than guessing what ChatGPT intended.

## Conflict resolution

If agents disagree:

1. check explicit product-owner decisions
2. check current verified implementation
3. check approved architecture/blueprints
4. check audits and decision records
5. document the conflict
6. escalate only the actual unresolved decision

An agent must not resolve a strategic conflict by silently rewriting the other agent's documentation.

## Non-goal

This document does not require a strict frontend/backend wall. A bug may cross every layer. The goal is clear ownership of the *primary responsibility* while preserving collaboration and review.
