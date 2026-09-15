# Shade Documentation

> **Shade is a native computational platform for creating, executing, understanding, connecting, and evolving digital and physical work.**

This is the canonical engineering documentation for Shade. The repository is the source of truth for the language, platform contracts, runtime model, artifact model, capabilities, and implementation roadmap.

## Documentation map

- [What is Shade?](./PLATFORM.md)
- [Shade Language](./LANGUAGE.md)
- [Project and Artifact Model](./PROJECTS.md)
- [Runtime and Execution](./RUNTIME.md)
- [Capabilities and Security](./CAPABILITIES.md)
- [Roadmap](./ROADMAP.md)

## Current status

Shade is an early design-and-runtime implementation. The first real vertical slice is:

`Shade source -> parser -> semantic model -> project model -> project graph -> IR -> interpreter -> execution evidence`

The browser interpreter is a development runtime, not a security boundary. Native, sandboxed, distributed, and device execution are platform milestones rather than claims of current availability.

## Core principles

1. **Reality over simulation.** Unsupported capabilities must report that they are unavailable.
2. **Artifacts over files.** Source code is one kind of artifact inside a larger project model.
3. **Meaning before execution.** Semantic understanding and capability requirements are explicit.
4. **Capabilities are governed.** A requirement is not an authorization grant.
5. **Execution produces evidence.** Results, diagnostics, tests, and project state can become structured evidence.
6. **Human and machine interaction share a model.** Type, voice, touch, camera, and AI actions should operate on the same artifacts through governed intents.
7. **Portable by design.** Shade should be able to target browser, native, edge, device, and distributed execution without changing the meaning of the project.

## Versioning

Current design-core language version: `0.1.0-design-core`.

This version is experimental. Syntax, semantics, manifests, IR, and capability contracts may evolve before a stable Shade specification is declared.

## Implementation

The current implementation lives under `src/lib/shade` and is exposed to Comp Lab through the Shade execution environment.

## Specification rule

If documentation and implementation disagree, do not silently choose one. Record the discrepancy, determine the intended contract, add tests where possible, and update the documentation and implementation together.
