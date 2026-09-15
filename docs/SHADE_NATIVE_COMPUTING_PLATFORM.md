# Shade Native Computing Platform

Status: Vision + architecture foundation

## 1. What Shade Is

Shade is not only a programming language.

Shade is a proposed **native computational model and development platform** for Shadecode. The language is one expression of the model. The larger system defines how programs, projects, data, interfaces, runtimes, devices, learning evidence, and AI intelligence fit together.

The core idea:

> Computing should understand the thing being built, the person building it, the environment executing it, and the purpose behind it.

Shade should eventually provide a coherent model for:

- language and syntax
- semantic program representation
- project/artifact structure
- execution and runtime routing
- UI and application surfaces
- data and storage
- tests and verification
- debugging and diagnostics
- device capabilities
- local/offline execution
- remote/edge execution
- collaboration and version history
- learning and assessment evidence
- Cortex intelligence
- deployment and distribution

Comp Lab is the first user-facing environment for this technology.

## 2. The Stack

```text
Shadecode Platform
        |
        +-- Comp Lab
        |     +-- Editor / Workspace
        |     +-- Algorithm Studio
        |     +-- Web / App / Data surfaces
        |     +-- Project Explorer
        |
        +-- Shade Model
        |     +-- Language
        |     +-- Semantic Model
        |     +-- Shade IR
        |     +-- Artifact Model
        |     +-- Project Graph
        |
        +-- Shade Runtime
        |     +-- Browser
        |     +-- Native
        |     +-- Local device
        |     +-- Edge / ShadeNet
        |     +-- Optional cloud
        |
        +-- Shade Intelligence
              +-- Cortex
              +-- Learning Graph
              +-- Diagnostics
              +-- Assessment
              +-- Project understanding
```

The exact product names may change. The architecture should not depend on the names.

## 3. Why This Exists

Existing development tools are excellent at pieces of the problem:

- VS Code and IDEs provide editing and tooling.
- Programming languages provide syntax and execution models.
- Cloud IDEs provide remote environments.
- AI coding tools provide generation and assistance.
- Learning platforms provide lessons and assessment.

Shade's opportunity is to make these pieces first-class parts of one computational model instead of loosely connected features.

Shade must not become a cosmetic clone of VS Code with an AI sidebar.

## 4. Shade Language

Shade is the first concrete language expression of the model.

Initial goals:

- readable enough for beginners
- expressive enough for serious software
- structured enough for machine understanding
- portable across execution environments
- capable of representing projects, data, interfaces, tests, and computation
- compatible with gradual progression from school to professional development

Initial language concepts include:

- values and variables
- numbers, text, booleans
- lists and records
- functions
- conditionals
- loops
- input/output
- modules
- errors
- tests
- structured diagnostics

Future concepts may include first-class project, data, UI, event, task, test, and deployment constructs, but these must earn their place through real use cases rather than syntax inflation.

## 5. Shade Semantic Model

A Shade program should not stop at source text and an AST.

The pipeline should eventually be:

```text
Source
  -> Tokens
  -> AST
  -> Semantic Model
  -> Shade IR
  -> Execution Plan
  -> Runtime
  -> Evidence
```

The semantic model should expose facts such as:

- declarations
- dependencies
- data flow
- control flow
- types
- side effects
- resource requirements
- external capabilities
- tests
- project relationships
- learner-relevant concepts

This gives Cortex structured information instead of forcing it to infer everything from source text.

## 6. Shade IR

Shade IR is a proposed intermediate representation shared by language tooling and runtimes.

It should allow a program written in Shade to be represented independently from a particular execution target.

Potential targets:

- browser JavaScript
- WebAssembly
- Python interoperability
- JVM ecosystems
- .NET ecosystems
- native C/C++ tooling
- remote execution
- future Shade-native runtime

The IR should preserve semantic information where possible, not merely flatten everything into generated source code.

## 7. The Artifact Model

Shade should treat software as more than files.

A project may contain:

```text
Project
  +-- source
  +-- data
  +-- assets
  +-- interfaces
  +-- tests
  +-- documentation
  +-- configuration
  +-- runtime requirements
  +-- deployment target
  +-- version history
  +-- learning evidence
```

The project is an addressable artifact graph.

This supports web apps, desktop programs, data projects, algorithms, scientific work, documentation, spreadsheets, and future project types without forcing every artifact into the same file abstraction.

## 8. Project Graph

The environment should understand relationships between artifacts.

Example:

```text
Dashboard.tsx
   |
   +--> StudentService.ts
             |
             +--> students.sql
             |
             +--> Student model
             |
             +--> tests
```

The graph can answer questions such as:

- What depends on this file?
- What breaks if this function changes?
- Which tests cover this code?
- Which runtime capability does this project require?
- Which part of the project is failing?
- Which concepts does the learner repeatedly struggle with?

## 9. Runtime Model

Shade must distinguish language support from actual execution.

```text
                    Shade Program
                          |
                    Capability Broker
                          |
          +---------------+---------------+
          |               |               |
       Local          Remote/Edge       Cloud
          |               |               |
       Runtime         Runtime          Runtime
```

Routing should consider:

- language
- project requirements
- device capabilities
- CPU/memory limits
- network availability
- privacy class
- user permission
- execution cost
- latency
- security level

The system must never claim that code ran when it only generated or simulated it.

## 10. Offline-First Principle

Shade should be useful without permanent internet access.

Possible offline capabilities:

- editing
- local project storage
- supported local runtimes
- tests
- diagnostics
- cached documentation
- local learning state
- selected local AI
- synchronization when connectivity returns

This matters particularly for low-bandwidth environments and mobile use.

## 11. Device as a Computing Node

A user's phone, laptop, desktop, or future Shade device can become a node in the computational fabric.

A phone could:

- edit a project
- capture a diagram or handwritten algorithm
- issue a voice command
- inspect results
- send a heavy build to a trusted laptop

A laptop could:

- compile native code
- run desktop software
- host a local development service

An edge node could:

- provide shared computation for a school or lab
- host curriculum resources
- run approved workloads locally

This builds on Shadecode's existing native-platform and device-capability architecture.

## 12. Capabilities, Not Assumptions

Shade should use explicit capability contracts.

Examples:

```text
runtime.python
runtime.native-cpp
device.camera
device.microphone
device.files
device.print
network.internet
storage.local
storage.remote
```

Every capability should define availability, permissions, limits, privacy class, network requirement, and fallback behavior.

## 13. Cortex Integration

Cortex should not be a chatbot pasted beside the editor.

It should consume the structured Shade model.

Cortex should be able to reason over:

- source
- semantic model
- project graph
- runtime result
- diagnostics
- test evidence
- learner history
- curriculum context
- device capabilities
- project goal

Possible operations:

```text
Explain
Diagnose
Teach
Suggest
Refactor
Test
Trace
Plan
Review
Compare
Generate
```

The learner remains in control. Mutating actions require appropriate trust levels and confirmation.

## 14. Learning Is a Separate Layer

Shade can expose learning evidence, but the language itself must not become curriculum-specific.

The separation is:

```text
Shade Program
      |
Semantic evidence
      |
Learning Graph
      |
Curriculum layer
      |
Board / qualification / syllabus / objective
```

This allows Shade to serve a professional developer without pretending that programming syntax is an exam board.

For students, the same execution can produce evidence about concepts such as:

- sequence
- selection
- iteration
- arrays
- functions
- testing
- algorithms
- data structures
- debugging

Official curriculum mappings must remain verified and versioned.

## 15. Assessment

Assessment should be evidence-based.

Shade should distinguish:

- runtime correctness
- test correctness
- static correctness
- explanation quality
- tracing evidence
- project structure
- curriculum evidence

Browser-side tests may provide formative feedback. Authoritative assessment must use a trusted server/isolated runner and protected test cases.

The system must never falsely claim official examiner marking.

## 16. Debugging as a First-Class Operation

Instead of only showing a stack trace, Shade should eventually expose:

```text
What happened?
Why did it happen?
Where did it originate?
What state existed at the time?
What can be tested next?
What concept does this relate to?
```

A trace could connect source code, runtime state, tests, and project graph.

## 17. Testing as Part of the Model

Tests should be addressable artifacts, not only editor text.

Shade should eventually support:

- unit tests
- integration tests
- project tests
- property-based tests
- boundary tests
- invalid-input tests
- hidden assessment tests
- regression tests

The runtime should return structured evidence.

## 18. Safety and Security

Shade must treat execution as a security boundary.

Potential controls:

- CPU limits
- memory limits
- wall-clock limits
- output limits
- filesystem isolation
- network policy
- process isolation
- permissioned device capabilities
- trusted execution nodes
- package/dependency policy
- audit events

The browser runtime is useful for fast formative execution but is not automatically a secure sandbox for hostile code.

## 19. Interoperability

Shade should not attempt to erase existing ecosystems.

It should interoperate with:

- Git
- GitHub
- npm
- PyPI
- Maven/Gradle
- NuGet
- Cargo
- Go modules
- SQL databases
- REST APIs
- files and common data formats

A serious developer should be able to adopt Shade without abandoning the software ecosystem they already use.

## 20. Existing Languages Remain First-Class

Comp Lab will continue supporting established languages and environments.

Shade is additive, not a mandate to rewrite everything.

The platform should eventually allow:

```text
Shade project
  +-- Shade
  +-- Python
  +-- TypeScript
  +-- SQL
  +-- C#
  +-- assets
```

The project graph and capability system provide the common layer.

## 21. Collaboration and Provenance

Future Shade projects should be able to understand:

- who changed an artifact
- what changed
- why it changed
- what tests were run
- what failed
- which version produced an artifact
- which runtime produced a result

This can make debugging and learning history substantially more useful than a simple commit log.

## 22. Explainability and Provenance

Every meaningful generated or assessed result should eventually have provenance.

Examples:

```text
Generated by: Cortex
Based on: project graph + selected files
Changed: 4 files
Tests run: 12
Tests passed: 12
Runtime: Python 3.x
Evidence: formative
```

For educational content, provenance should include curriculum source/version where applicable.

## 23. Natural Interaction

Shade should work with more than a keyboard.

Existing Shadecode platform architecture should support:

- typing
- voice
- touch
- camera/vision
- structured commands

Examples:

> “Explain why this loop never stops.”

> “Run the tests.”

> “Show me the dependency causing this error.”

> “Turn this handwritten flowchart into a project.”

These should resolve to typed intents and platform operations, not unrestricted natural-language shell access.

## 24. Deployment Model

Eventually a Shade project could move through:

```text
Idea
  -> Prototype
  -> Build
  -> Test
  -> Package
  -> Deploy
  -> Observe
  -> Improve
```

The same project identity should survive the transition.

Potential targets include:

- web
- PWA
- desktop
- mobile
- local server
- school/edge node
- cloud
- native executable

## 25. The Big Differentiator

The strongest claim should not be:

> “Shade has nicer syntax.”

It should be:

> **Shade is a computational model in which programs, projects, execution environments, devices, intelligence, and learning evidence can understand one another.**

That is the territory worth defending.

## 26. What Shade Must Not Become

Do not build:

- a Python clone with different keywords
- an AI autocomplete wrapper
- a fake universal compiler
- a browser pretending to be a native operating system
- an exam-only language
- a locked-in proprietary ecosystem with no interoperability
- a giant syntax specification before real use cases exist
- a marketing concept without a working runtime

## 27. Initial Technical Strategy

Build vertically, not horizontally.

### Phase 0: Core

- lexer
- parser
- AST
- diagnostics
- interpreter
- tests

### Phase 1: Semantic Core

- type checking
- symbol resolution
- semantic diagnostics
- source maps
- structured program model

### Phase 2: Shade IR

- define IR schema
- lower simple programs into IR
- execution trace representation
- deterministic serialization

### Phase 3: Comp Lab

- `.shade` files
- Shade project template
- syntax highlighting
- diagnostics
- run/debug/test surfaces
- project graph

### Phase 4: Intelligence

- Cortex structured context
- explain/diagnose/teach
- learner evidence
- project-aware assistance

### Phase 5: Runtime Expansion

- WebAssembly target
- stronger local execution
- native toolchain bridge
- trusted remote execution
- edge node

### Phase 6: Platform

- package format
- project manifest
- deployment targets
- collaboration
- device-to-device execution

## 28. Design Principles

1. **Reality over simulation.** Never claim execution that did not happen.
2. **Evidence over guesses.** Assessment and intelligence should use observable evidence.
3. **Local first when possible.** Reduce unnecessary cloud dependency.
4. **Interoperate by default.** Existing ecosystems are assets.
5. **Project over file.** Software is a graph of related artifacts.
6. **Capability over assumption.** Runtime/device features must be explicit.
7. **Human control.** AI actions use typed intents and trust boundaries.
8. **Curriculum is a layer.** Shade remains useful outside education.
9. **Progressive complexity.** Beginners and professionals should share a path without forcing one interface on everyone.
10. **Build the smallest real core first.** Every abstraction must earn its existence.

## 29. North Star

> **Make computing understandable, executable, portable, intelligent, and continuously connected to the thing a person is trying to accomplish.**

Comp Lab is where users experience it.

Shade is the computational foundation underneath it.

Cortex is the intelligence layer around it.

The Learning Graph is the evidence layer connecting experience and growth.

Together they form a potential Shadecode-native computing platform, not merely another IDE.

## 30. Immediate Decision

The next implementation milestone is not “add more languages.”

It is to turn Shade from a small interpreter into a **real language + semantic model + project model + execution contract**, while keeping the first implementation deliberately small and testable.
