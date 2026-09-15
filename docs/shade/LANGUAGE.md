# Shade Language

## Purpose

Shade is the native language layer of the broader Shade platform. It is designed to be readable by learners while retaining a semantic structure that can support analysis, execution, testing, explanation, and future compilation.

## Current language model

The current implementation includes constructs for:

- literals and variables
- arrays
- arithmetic and comparison expressions
- boolean expressions
- assignment
- `show` output
- `input`
- `if` / `else`
- `while`
- `for`
- functions
- `return`
- function calls
- built-ins such as `length` and `sum`

The exact syntax is experimental and is defined by the lexer/parser implementation and its tests.

## Semantic pipeline

Source code is not sent directly to a runtime as an opaque string.

```text
source
  ↓
lexer
  ↓
parser
  ↓
typed Shade AST
  ↓
semantic analysis
  ↓
project model
  ↓
project graph
  ↓
Shade IR
  ↓
runtime
```

This gives Shade multiple places to inspect and explain what a program means.

## Design goals

### Readability

Shade should be approachable to a student learning programming for the first time.

### Explicit meaning

Programs should have enough structure for the platform to identify symbols, dependencies, concepts, and capability requirements.

### Portability

The meaning of a Shade program should not depend on one specific execution device.

### Explainability

The platform should eventually be able to answer questions such as:

- What does this program do?
- Which values can change here?
- Why did this branch execute?
- Which capability does this operation require?
- Where did this result come from?
- What changed between two attempts?

### Interoperability

Shade should be able to coexist with established languages rather than requiring every existing project to be rewritten.

## Stability policy

`0.1.0-design-core` is not a stable language specification. Breaking changes are permitted while the semantic model, IR, and project model are being established.

A future stable specification should freeze syntax only after semantic behavior, diagnostics, project manifests, and execution contracts are sufficiently tested.
