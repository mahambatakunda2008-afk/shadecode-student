# Cortex Core Architecture

Cortex is a provider- and protocol-neutral orchestration layer. Interfaces such as Shadecode Student, WebMCP, WhatsApp, voice, and future hardware should call domain capabilities rather than implement their own workflow logic.

## Execution model

1. **Understand**: normalize the user's task and context.
2. **Plan**: select the smallest useful set of specialist agents.
3. **Execute**: invoke only handlers explicitly registered by the host interface.
4. **Verify**: require a verifier result before claiming a build or checked result is verified.
5. **Remember**: persist useful evidence through the host's memory/evidence layer.
6. **Respond**: return the useful result and evidence, not internal agent chatter.

The first implementation is intentionally deterministic. A model can later author richer plans, but the execution contract remains the same.

## Agent boundaries

| Agent | Capability | Default boundary |
| --- | --- | --- |
| Researcher | `research` | Gather and synthesize information |
| Builder | `build` | Produce an artifact or implementation |
| Verifier | `verify` | Check results and provide evidence |
| Tutor | `teach` | Explain/adapt learning content |

Agents do not inherit one another's permissions. A handler must be registered by the host, and the declared capability must be permitted for that agent.

## Why this belongs in `src/lib/cortex`

The core has no React, browser, Supabase, WebMCP, Gemini, or provider-specific dependency. This keeps it usable by every current and future interface and makes the orchestration behavior unit-testable.

## Current integration

`src/lib/capabilities/index.ts` exposes the core alongside the existing local-first study capabilities. `StudentWebMCP` continues to register workflow-oriented study tools and remains a progressive enhancement, so Shadecode Student does not depend on WebMCP support.

## Next slices

- Connect Cortex planning to the existing `callAI` provider router without moving provider logic into the orchestrator.
- Add a host-owned evidence/memory adapter.
- Add a WebMCP Cortex task tool that can inspect state, create a plan, and execute approved capabilities.
- Add a student-facing Cortex workflow for lesson → practice → verification → remediation.
- Add voice and physical-node adapters without changing the core contracts.
