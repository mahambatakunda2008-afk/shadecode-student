# Shade Debugging Model

Shade debugging is source-aware. The debugger treats source lines, semantic entities, project artifacts, IR instructions, and runtime evidence as connected views of one computation.

## Layers

1. Source: the learner's `.shade` file.
2. Semantic model: symbols, concepts, diagnostics, and capabilities.
3. Project graph: artifacts and relationships.
4. IR: executable intermediate representation with source-line references.
5. Runtime evidence: output, diagnostics, duration, exit status, and future execution snapshots.

## Current implementation

Comp Lab can inspect generated IR and map instructions back to source lines. The debugger model provides an index from instruction IDs to source locations and can retrieve instructions for a source line.

## Planned stepping

Future trusted runtimes may expose snapshots containing instruction ID, source location, locals, call stack, and capability state. Browser execution must remain bounded and must not expose privileged host capabilities.

## Security boundary

Debugging is an observation capability. It must not bypass capability policy, permissions, sandbox limits, assessment protections, or privacy boundaries.
