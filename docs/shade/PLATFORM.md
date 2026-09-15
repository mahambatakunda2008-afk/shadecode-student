# Shade Platform

## Definition

Shade is not only a programming language. It is a computational platform and model that gives programs, data, devices, workflows, tests, deployments, learning evidence, and other work a common semantic and execution framework.

A useful mental model is:

`Shade Language + Semantic Model + IR + Runtime + Artifact Model + Project Graph + Capability System + Interaction Model + Intelligence + Evidence`

Comp Lab is the user-facing environment where these pieces become usable.

## What Shade is designed to create

Shade should eventually support:

- command-line and console programs
- websites and web applications
- APIs and backend services
- desktop applications
- mobile applications
- databases and data workflows
- scientific and mathematical programs
- simulations
- automation and agents
- games and interactive media
- systems software
- device and IoT workflows
- distributed applications
- documents, datasets, diagrams, spreadsheets, and other structured artifacts
- learning and assessment projects

These are target capabilities, not a claim that every target is currently executable.

## The Shade stack

| Layer | Role |
|---|---|
| Shade Language | Express computation and intent |
| Semantic Model | Understand symbols, concepts, dependencies, and requirements |
| Shade IR | Represent executable computation in a stable intermediate form |
| Runtime | Execute a project on an approved target |
| Artifact Model | Represent code, data, tests, assets, documents, deployments, and other work |
| Project Graph | Connect artifacts, symbols, capabilities, and concepts |
| Capability System | Describe and govern access to resources |
| Intent System | Turn human or AI actions into typed, permission-aware operations |
| Workflow Engine | Coordinate multi-step work |
| Package Model | Reproduce and share projects and dependencies |
| Testing System | Verify behavior and preserve test evidence |
| Simulation | Explore behavior before committing to execution |
| Debugging Model | Explain failures across source, semantics, IR, and runtime |
| Distributed Runtime | Move approved computation between execution nodes |
| Offline Layer | Continue useful work without continuous connectivity |
| Cortex | Provide reasoning, explanation, planning, and adaptation |
| Learning Graph | Connect work and execution evidence to learning progress |
| Comp Lab | Provide the actual development and learning environment |

## The central loop

```text
Human / AI intent
       ↓
Artifact + Project Graph
       ↓
Semantic understanding
       ↓
Capability requirements
       ↓
IR / execution plan
       ↓
Approved runtime target
       ↓
Execution
       ↓
Tests + diagnostics + evidence
       ↓
Cortex / Learning Graph / next action
```

## Why this architecture matters

Traditional development tools often treat code as the center of the universe. Shade treats the **work being created** as the center.

A program can therefore be connected to its dataset, tests, deployment, device requirements, documentation, learning objectives, and previous execution evidence without forcing every relationship to live in comments or external tooling.

## Non-goals

Shade must not become:

- a fake universal runtime
- an opaque AI wrapper around existing languages
- a system that silently substitutes one language for another
- a privileged device-control layer without explicit capability governance
- an excuse to hide unsupported infrastructure behind optimistic UI

## Long-term North Star

> **A native computational environment for creating, executing, understanding, connecting, and evolving digital and physical work.**
