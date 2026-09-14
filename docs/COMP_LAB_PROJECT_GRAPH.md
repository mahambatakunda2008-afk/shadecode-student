# Comp Lab Project Graph

Comp Lab treats a learner project as a connected workspace, not a single editor buffer.

## What the graph records

- workspace files and detected language
- relative module dependencies
- reverse dependents
- unresolved relative imports
- entrypoints, meaning files with no incoming workspace dependency
- circular dependency paths

## Current approach

`src/lib/code-lab/project-graph.ts` uses deterministic lightweight source scanning. It intentionally does not claim compiler-grade module resolution. Package-manager dependencies, aliases, generated files, conditional imports, and language-specific build systems require the corresponding native or remote toolchain.

This distinction matters for Comp Lab: the UI can explain what it can prove from the workspace without pretending to have built a project when no compiler/runtime is connected.

## Intended next uses

1. Explorer dependency indicators.
2. Click-through from an import to its source file.
3. Problems entries for unresolved workspace imports and cycles.
4. Learning Companion context about project structure.
5. Build/test planning based on the dependency graph.
6. Larger university/polytechnic projects with multi-folder workspaces.
