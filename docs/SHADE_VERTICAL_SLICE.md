# Shade Vertical Slice

## Purpose

Shade is being built as a native computational platform, not merely a programming language. This document defines the first end-to-end slice that must remain real and testable.

## Current slice

`Shade source -> lexer/parser -> semantic model -> project model -> project graph -> IR -> interpreter -> execution evidence`

Comp Lab exposes this through the Shade execution environment.

## Contracts

### Language

The parser owns syntax and produces a typed Shade AST. Syntax errors stop execution.

### Semantic model

Semantic analysis identifies symbols, concepts, capabilities and diagnostics without granting capabilities.

### Project model

A project has a deterministic identity, entry artifact and language version. Artifact identity must remain stable for the same project/path.

### Project graph

The graph connects projects, artifacts, symbols, capabilities and concepts. Edges must reference real graph nodes. No hard-coded entry-node assumptions are permitted.

### IR

The intermediate representation is an inspectable execution representation. It is deliberately smaller than the source language and is intended to become the stable boundary between semantic analysis and multiple runtimes.

### Runtime

The browser interpreter is the current development runtime. It is not a security boundary and must never be described as one. Capability declarations do not automatically grant network, filesystem, device or privileged access.

### Evidence

Execution produces structured evidence: diagnostics, exit status, duration, output count, semantic findings and project metadata. Evidence can later feed the Learning Graph and assessment systems.

## Capability model

Capabilities are requirements first:

`program -> required capability -> broker -> approved execution target`

A declaration such as `network.internet` describes what a program needs. It does not itself authorize access.

## Next runtime milestones

1. IR source-location mapping.
2. IR inspection/debug view in Comp Lab.
3. Capability broker enforcement at execution boundaries.
4. Sandboxed server/native execution for languages requiring real toolchains.
5. Deterministic test artifacts and protected assessment execution.
6. Multi-file Shade package/module resolution.
7. Device and distributed execution through the platform capability contract.

## Non-goals

Shade must not become a fake universal runtime. Unsupported languages, operating-system APIs, hardware and privileged capabilities must report their real availability instead of silently falling back to an unrelated runtime.
