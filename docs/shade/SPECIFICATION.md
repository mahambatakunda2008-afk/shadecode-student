# Shade Specification

**Status:** Experimental design-core specification

**Current version:** `0.1.0-design-core`

This document defines the minimum contract for implementations of Shade. It is intentionally smaller than the long-term platform vision. Anything marked planned is not a claim of current availability.

## 1. Model

Shade treats computation as a project of connected artifacts rather than a source file alone.

The core pipeline is:

`source -> parse -> semantic model -> project model -> project graph -> IR -> runtime -> execution evidence`

## 2. Language

The Shade language expresses values, variables, arrays, expressions, functions, input/output, selection, iteration, and returns. Built-ins are capabilities or language services and must be explicitly documented.

The browser interpreter is a development runtime. It is not a security boundary and must not be used to claim secure execution of untrusted code.

## 3. Semantic model

An implementation may expose:

- symbols
- concepts
- dependencies
- required capabilities
- statement/expression counts
- control-flow categories
- input/output evidence
- language diagnostics

Semantic analysis must not silently grant capabilities.

## 4. Project model

A Shade project has a manifest containing:

- format and project version
- project name
- entry artifact path
- Shade runtime/language version
- artifacts
- capability requirements

Artifact identity is deterministic for a normalized project-relative path.

## 5. Project graph

The graph connects projects, artifacts, symbols, capabilities, and concepts. Current relations include:

- `contains`
- `defines`
- `requires`
- `uses`
- `implements`

Graph references must resolve to nodes known to the graph. Implementations must not create dangling artifact references merely because a dependency name was observed.

## 6. Intermediate representation

Shade IR version `0.1` currently contains operations for constants, loads/stores, binary operations, calls, output, input, conditional jumps, jumps, labels, and returns.

IR is an inspectable representation. It is not yet a stable cross-platform ABI.

## 7. Capabilities

A Shade program may declare requirements such as files, camera, microphone, network, or console access. A requirement is not an authorization grant.

Future runtimes must evaluate capabilities through the platform capability broker and apply permission, trust, privacy, and resource policies before execution.

## 8. Evidence

Execution should produce structured evidence such as:

- exit status
- duration
- diagnostics
- stdout/stderr
- semantic model
- project state
- tests and test results
- runtime/environment identity

Evidence can later feed Cortex and the Learning Graph, but learning claims must remain distinguishable from raw execution facts.

## 9. Compatibility rule

A runtime may report a capability as unavailable rather than pretending to execute it. Unsupported native, device, distributed, or cloud features must remain explicit.

## 10. Stability

`0.1.0-design-core` is experimental. Syntax, semantics, project manifests, IR, and capability contracts may change before a stable specification is declared.

When implementation and documentation disagree, record the discrepancy, add a regression test where possible, then update both together.
