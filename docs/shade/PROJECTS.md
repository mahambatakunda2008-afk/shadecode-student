# Shade Projects and Artifacts

## Artifact-first model

A Shade project is more than a directory of source files. It is a graph of artifacts with identity, type, relationships, and evidence.

An artifact may represent:

- source code
- data
- tests
- assets
- documents
- deployments
- datasets
- experiments
- generated outputs
- learning evidence

The model is intentionally extensible.

## Artifact identity

Artifact identity is deterministic from the normalized project-relative path in the current implementation.

This means the same project path should produce the same artifact ID across sessions and machines, subject to the current identity algorithm.

Artifact identity is important because graph edges, diagnostics, evidence, and future collaboration systems need stable references.

## Project manifest

The current project manifest uses the `shade-project` format and records:

- project name
- entry artifact path
- Shade runtime and language version
- artifacts
- required capabilities

Example shape:

```json
{
  "format": "shade-project",
  "version": "0.1",
  "name": "Example",
  "entry": "main.shade",
  "runtime": {
    "language": "shade",
    "version": "0.1.0-design-core"
  },
  "artifacts": [],
  "requirements": {
    "capabilities": []
  }
}
```

## Project graph

The graph connects:

- project → artifact
- artifact → artifact
- artifact → symbol
- artifact → capability
- artifact → concept
- test → artifact
- deployment → artifact

Every edge must reference an actual node. Hard-coded node IDs are prohibited.

## Why the graph matters

The graph is the foundation for:

- multi-file reasoning
- dependency analysis
- impact analysis
- intelligent refactoring
- debugging
- test selection
- deployment planning
- Cortex project understanding
- learning evidence
- collaboration and provenance

## Future artifact lifecycle

```text
create → edit → analyze → build → test → execute → observe → explain → publish/deploy → evolve
```

Each stage can produce evidence that remains attached to the project graph.
