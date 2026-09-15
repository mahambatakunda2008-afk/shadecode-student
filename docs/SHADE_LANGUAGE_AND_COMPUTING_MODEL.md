# Shade Language & Computing Model

## Status

**Design status:** Foundational proposal

**Scope:** Shadecode's native programming language, runtime model, project model, learning integration, and future compiler/toolchain.

This document defines the direction for **Shade**, a proposed programming language and computational model native to Shadecode. It is deliberately a design specification rather than a claim that the language or compiler already exists.

---

## 1. North Star

> **Shade is a programming language and computational model designed for people to build, understand, test, learn, and evolve software.**

Shade should not exist merely to create another syntax for `if`, `for`, and `print`.

Its purpose is to make the relationship between:

- the learner
- the program
- the project
- the computer
- the runtime
- the curriculum
- the evidence of learning
- and Cortex

first-class parts of one computing environment.

The goal is not to replace Python, JavaScript, C, Java, C#, or other established languages. Shade should provide a native layer for Shadecode while remaining capable of interoperating with existing ecosystems.

---

## 2. What Shade Is

Shade should be treated as **more than a programming language**.

It is a proposed stack consisting of:

```text
Shade Language
      ↓
Shade Compiler / Frontend
      ↓
Shade Intermediate Representation (Shade IR)
      ↓
Shade Runtime
      ↓
Execution Target
      ↓
Project + Learning Evidence
      ↓
Cortex
```

The language is the human-facing layer. The computational model underneath it gives Shadecode a stable representation of programs, projects, execution, testing, and learning evidence.

### 2.1 The product relationship

```text
Shadecode
   │
   └── Comp Lab
         │
         ├── Existing language environments
         │      ├── Python
         │      ├── JavaScript / TypeScript
         │      ├── Java
         │      ├── C / C++
         │      ├── C# / VB.NET
         │      └── others
         │
         └── Native Shade environment
                ├── Shade Language
                ├── Shade Runtime
                ├── Shade IR
                ├── Learning Graph integration
                └── Cortex integration
```

Comp Lab remains the user-facing development environment. Shade becomes the native computational model underneath one part of that environment.

---

## 3. The Problem Shade Should Solve

Existing languages are powerful, but they generally treat the program as the central artifact.

A Shade project treats the **entire computational activity** as the artifact.

A learner may be:

- learning an algorithm
- solving a school programming problem
- debugging a project
- building a web application
- designing a database
- preparing for a practical examination
- building a university project
- experimenting with a device
- documenting a solution
- testing software
- deploying an application

Shade should make these activities composable instead of forcing the environment to reconstruct intent from raw source code.

### Core question

> **What would programming feel like if the computer understood the learner, the project, the curriculum, the device, the execution target, and the goal?**

That question is the foundation of Shade.

---

## 4. Design Principles

### 4.1 Human-readable first

Shade should be readable by a beginner while remaining expressive enough for advanced developers.

### 4.2 Real execution, never fake execution

If Shade targets native code, a real native toolchain must execute it. If a target is unavailable, the system must report that honestly.

Shade must inherit Comp Lab's existing rule:

> **Supported does not mean browser-executed.**

### 4.3 Learn without becoming a toy language

Educational affordances must not prevent serious software development.

A student should be able to progress from:

```text
school exercise
→ algorithm
→ application
→ university project
→ professional software
```

without abandoning the language's core model.

### 4.4 Artifact-first

A program is part of a project, not the whole project.

### 4.5 Evidence-first assessment

Learning claims should be based on actual evidence such as:

- execution
- tests
- attempts
- traces
- debugging history
- project structure
- explanations
- revisions
- objective alignment

The system must never fabricate official examination marks.

### 4.6 Offline and low-bandwidth capable

The language and project representation should be designed so that progressively more of the workflow can operate locally.

### 4.7 Multi-device continuity

A project should be able to move between phone, browser, desktop, and trusted native/edge devices without losing its identity or learning context.

### 4.8 AI is an interpreter of intent, not the owner of the code

Cortex may explain, diagnose, teach, suggest, and transform, but the program remains the student's artifact.

### 4.9 Interoperability over isolation

Shade should be able to consume and produce useful representations for existing languages and tools.

### 4.10 Security by construction

Executing learner code must be treated as a security boundary. The language design should avoid making unrestricted shell, filesystem, network, or device access implicit.

---

## 5. Why Shade Is Different

Shade's differentiation should come from the combination of capabilities, not from syntax alone.

### 5.1 Curriculum-aware computation

Shade can associate an activity with:

```text
board
→ qualification / level
→ subject
→ syllabus
→ objective
→ skill
→ exercise
→ evidence
```

This follows Shadecode's curriculum contract.

A student may therefore be writing code that the environment knows is evidence for a specific learning objective, without changing the meaning of the code itself.

### 5.2 Learning-aware runtime

The runtime can expose structured execution information to the learning system:

```text
Program
→ execution
→ diagnostics
→ tests
→ evidence
→ Learning Graph
```

For example, repeated off-by-one failures could become evidence of a recurring loop-boundary difficulty rather than being treated as isolated compiler errors.

### 5.3 Project-aware development

Shade should understand a project graph containing:

```text
source files
imports
modules
data
configuration
tests
dependencies
interfaces
artifacts
documentation
runtime targets
history
learning evidence
```

### 5.4 Goal-aware workflows

The same code can participate in different workflows:

```text
learn
practice
build
run
test
debug
explain
assess
document
deploy
```

The goal should be represented explicitly rather than inferred solely from UI state.

### 5.5 Native Cortex integration

Cortex should receive structured program/project context rather than being forced to infer everything from source text.

### 5.6 Multi-target execution

Shade should eventually target multiple environments through a common intermediate representation and capability system.

### 5.7 Learner continuity

The environment can remember what happened to a project without pretending that memory is part of the programming language's semantics.

This distinction is important:

> **Shade code should remain deterministic; Shadecode can remain contextual.**

---

## 6. Proposed Language Philosophy

Shade should use a familiar programming foundation with carefully chosen native concepts.

It should feel approachable rather than alien.

A beginner should be able to understand:

```shade
name = input("What is your name?")
show "Hello, " + name
```

without learning a giant framework first.

At the same time, advanced Shade should support concepts such as:

```shade
project StudentPortal

module Students

record Student
    name: text
    age: number

function average(scores: list<number>) -> number
    return sum(scores) / length(scores)
```

The exact syntax is **not yet frozen**. Syntax should be developed only after the semantic model is agreed.

---

## 7. Shade's Native Concepts

The language should investigate the following first-class concepts.

### 7.1 Values

Potential core values:

- number
- decimal
- text
- boolean
- null / none
- list
- map
- set
- record
- bytes
- date/time

### 7.2 Functions

Functions should be ordinary, composable values with explicit parameters and return values.

### 7.3 Modules

Modules provide project-scale organization.

### 7.4 Projects

A `project` describes the boundary of a computational artifact.

Example:

```shade
project StudentTracker
```

A project can contain source, tests, data, resources, configuration, documentation, and target metadata.

### 7.5 Data

Data should be easy to represent and transform.

Potential forms:

```shade
data students from "students.csv"
```

This is a design direction, not finalized syntax.

### 7.6 Tests

Testing should be a first-class language/runtime concept rather than merely an external convention.

Potential direction:

```shade
test "average of three values"
    expect average([10, 20, 30]) == 20
```

### 7.7 Events

For applications and interfaces:

```shade
on click SaveButton
    save()
```

### 7.8 Interfaces / screens

Application development may eventually use declarative constructs:

```shade
screen Dashboard
    title "Student Progress"
    show progress
```

The implementation target could vary by platform.

### 7.9 Tasks / concurrency

Long-running and asynchronous work should have explicit semantics.

Potential concepts:

```text
task
async
await
parallel
stream
```

Exact semantics require formal design before implementation.

### 7.10 Device capabilities

Device access should be explicit and permission-aware.

Potential direction:

```shade
use camera
use microphone
use notifications
```

The runtime must still enforce capability permissions.

### 7.11 Learning metadata

Learning-related metadata should be attached to project activities and evidence rather than silently altering ordinary language semantics.

Potential direction:

```shade
practice objective "alg.iteration"
```

This is a proposed capability, not finalized syntax.

---

## 8. Separate Language Semantics From Shadecode Context

This is a critical architectural rule.

Shade itself should not become dependent on a specific school's curriculum database.

Instead:

```text
Shade Language
        ↓
Semantic program
        ↓
Shade IR
        ↓
Shadecode context
        ├── curriculum
        ├── learner
        ├── assessment
        ├── Cortex
        └── project history
```

This allows Shade to remain a real programming language while Shadecode remains a learning platform.

A professional developer using Shade should not need a school profile for the language to work.

---

## 9. Shade Intermediate Representation

A **Shade IR** should become the central structural representation between source code and execution targets.

Conceptually:

```text
Shade Source
     ↓
Lexer / Parser
     ↓
AST
     ↓
Semantic Analysis
     ↓
Shade IR
     ├── execution
     ├── optimization
     ├── diagnostics
     ├── testing
     ├── project analysis
     ├── learning evidence
     └── target compilation
```

The IR should preserve useful high-level information instead of immediately destroying it through compilation.

Potential IR information:

- declarations
- types
- control flow
- data flow
- function boundaries
- module relationships
- source locations
- test boundaries
- effects/capabilities
- dependency relationships
- optimization hints
- source maps

The exact IR format must be designed later.

---

## 10. Execution Model

Shade should support multiple execution targets without pretending they are interchangeable.

```text
                  Shade
                    ↓
                 Shade IR
                    ↓
       ┌────────────┼────────────┐
       ↓            ↓            ↓
   Browser        Native       Remote
   runtime        runtime       node
       ↓            ↓            ↓
      Web       Desktop/OS   Edge/Server
```

Possible future targets include:

- WebAssembly
- JavaScript interoperability
- native desktop
- Linux
- Windows
- Android/mobile
- trusted ShadeNet nodes
- server/edge execution

Target availability should be exposed through the existing platform capability model.

---

## 11. Effects and Capabilities

One of Shade's strongest potential differentiators is making privileged operations explicit.

A program should not automatically receive access to:

- filesystem
- camera
- microphone
- network
- Bluetooth
- USB
- notifications
- processes
- system resources

Instead, access should be represented as capabilities/effects that the runtime can authorize.

Conceptually:

```text
pure computation
        ↓
local data
        ↓
filesystem
        ↓
network
        ↓
device
        ↓
system
```

This can support safer execution, better explanations, and clearer deployment behavior.

---

## 12. Error Model

Errors should be structured.

A Shade diagnostic should distinguish at least:

```text
syntax error
semantic/type error
runtime error
timeout
resource limit
permission error
network error
dependency error
toolchain error
learner/test failure
```

The distinction between **program failure** and **environment/toolchain failure** is essential.

For example:

```text
Your program failed a test.
```

is fundamentally different from:

```text
The C compiler is unavailable on this device.
```

Shadecode should never collapse those into one generic red error.

---

## 13. Testing Model

Testing should be deeply integrated.

A future Shade test system should support:

- unit tests
- integration tests
- property-based tests
- boundary tests
- invalid-input tests
- hidden assessment cases
- performance checks
- regression tests

However, hidden assessment cases must be protected from the browser and client code when they are intended to be authoritative.

This follows the existing Comp Lab assessment security model.

---

## 14. Assessment Model

Shade should enable evidence collection without turning the language into an examination engine.

Potential evidence:

```text
objective
exercise
attempt
source revision
execution
visible tests
protected tests
trace
explanation
final artifact
```

The authoritative assessment boundary remains server-side.

Shade can produce structured evidence; Shadecode's assessment service decides what evidence is trusted.

---

## 15. Cortex Integration

Cortex should eventually understand Shade at multiple levels.

### Level 1: Syntax

“What does this code mean?”

### Level 2: Semantics

“What is this program trying to compute?”

### Level 3: Project

“How do these files and dependencies fit together?”

### Level 4: Learner

“What has this learner struggled with?”

### Level 5: Curriculum

“Which objective is this activity evidence for?”

### Level 6: Goal

“What is the learner trying to accomplish?”

Cortex should therefore operate on structured context such as:

```json
{
  "project": "StudentPortal",
  "goal": "debug",
  "language": "shade",
  "concepts": ["iteration", "arrays"],
  "objective": "alg.iteration",
  "tests": {
    "passed": 8,
    "failed": 1
  },
  "diagnostics": [],
  "runtime": "local"
}
```

This is illustrative only. The production schema must be versioned and designed separately.

---

## 16. Explainability

Shade should make program execution inspectable.

A learner should eventually be able to ask:

```text
Why did this output happen?
```

and the system should be able to show:

```text
input
 ↓
assignment
 ↓
condition
 ↓
loop iteration 1
 ↓
loop iteration 2
 ↓
function call
 ↓
return value
 ↓
output
```

This could become a powerful bridge between ordinary programming and the existing Comp Lab algorithm/trace-table experience.

---

## 17. Debugging as a First-Class Workflow

Shade should eventually expose structured debugging operations:

```text
run
pause
step
step-over
step-into
inspect
watch
trace
continue
```

Because Shade IR retains semantic information, debugging can potentially show concepts rather than only machine-level details.

Example:

```text
Loop iteration: 4 / 10
Current value of total: 37
Condition: i <= 10 → true
```

The goal is not to hide complexity forever. The goal is to reveal the right layer of complexity at the right time.

---

## 18. Progressive Complexity

Shade should support progressive disclosure.

### Beginner

```shade
name = input("Name")
show name
```

### Intermediate

```shade
function average(values: list<number>) -> number
    return sum(values) / length(values)
```

### Advanced

```text
modules
interfaces
concurrency
networking
generics
native interop
memory-sensitive programming
```

The language should not require beginners to understand advanced runtime concepts before they can build useful programs.

---

## 19. Interoperability

Shade should not become an island.

Potential interoperability layers:

```text
Shade ↔ JavaScript
Shade ↔ TypeScript
Shade ↔ Python
Shade ↔ C
Shade ↔ C++
Shade ↔ Java
Shade ↔ .NET
Shade ↔ SQL
```

Potential mechanisms include:

- generated bindings
- foreign-function interfaces
- subprocess/toolchain integration
- generated source
- WebAssembly modules
- HTTP/API boundaries
- package adapters

The safest and most maintainable mechanism should be selected per target.

---

## 20. Package and Dependency Model

A serious language needs a dependency story.

Shade should eventually define:

- package identity
- semantic versions
- dependency ranges
- lockfiles
- integrity checks
- registries
- local packages
- offline caches
- reproducible builds

Security should be considered from the beginning rather than bolted on later.

---

## 21. Project Model

A Shade project should be more than a directory of source files.

Conceptually:

```text
Shade Project
├── source
├── tests
├── data
├── assets
├── configuration
├── dependencies
├── documentation
├── target
├── build metadata
└── learning metadata
```

Learning metadata must remain separable from the source artifact so that projects can be exported or used outside Shadecode.

---

## 22. Multi-Device Model

Shade should fit Shadecode's native platform architecture.

```text
Phone
  ↕
Web/PWA
  ↕
Desktop
  ↕
Trusted personal device
  ↕
ShadeNet / edge node
  ↕
Optional cloud
```

A low-power phone could edit and understand a project while a trusted computer performs a heavy native build.

The user should not need to understand where the computation happened unless it matters.

When it matters, the system should explain it.

---

## 23. Offline-First Direction

The minimum Shade workflow should progressively become available without a network:

```text
edit
→ parse
→ diagnose
→ basic execute
→ test
→ save
→ inspect
```

Network-dependent capabilities should be explicit.

This aligns with Shadecode's low-data and offline goals.

---

## 24. Security Model

Shade must assume that code can be hostile, buggy, or resource-intensive.

Required future controls include:

- process isolation
- filesystem isolation
- network policy
- CPU limits
- memory limits
- wall-clock limits
- output limits
- dependency restrictions
- capability permissions
- deterministic execution modes
- trusted native toolchains
- signed or verified packages where appropriate

Browser execution must not be treated as a complete security boundary merely because code runs inside a Web Worker.

---

## 25. Performance Model

Shade should eventually support multiple optimization tiers.

```text
interactive interpretation
        ↓
JIT / optimized runtime
        ↓
native compilation
        ↓
cross-target compilation
```

The implementation should optimize for fast feedback during learning while retaining a path to serious production workloads.

---

## 26. Tooling

A real Shade ecosystem will eventually require:

- compiler
- formatter
- linter
- language server
- debugger
- package manager
- test runner
- build system
- documentation generator
- profiler
- project analyzer
- formatter/import organizer
- source maps
- migration tooling

Comp Lab should consume these tools through stable interfaces rather than embedding every capability directly in the UI.

---

## 27. Language Server

A future Shade Language Server should power:

- autocomplete
- hover information
- go-to-definition
- references
- rename
- diagnostics
- refactoring
- symbol search
- code actions
- semantic highlighting

This should be one of the earliest serious tooling targets after the parser/compiler foundation.

---

## 28. Formatter and Style

Shade should have an official formatter rather than encouraging endless style arguments.

The formatter should be deterministic and project-aware.

Potential command:

```text
shade format
```

Exact CLI design is not yet fixed.

---

## 29. CLI Direction

A future command-line interface could expose:

```text
shade init
shade run
shade test
shade build
shade check
shade format
shade debug
shade package
shade publish
shade explain
```

These names are provisional.

The CLI should be usable outside Shadecode so the language remains a real development technology rather than a locked-in app feature.

---

## 30. Web and Application Development

Shade should investigate whether application development can become a first-class target without turning the language into a markup-only framework.

Potential model:

```shade
app StudentTracker

screen Dashboard
    show students
    show progress

on click Student
    navigate StudentDetails
```

The same project could contain ordinary functions, data structures, tests, APIs, and business logic.

The compiler/runtime would choose an appropriate target.

---

## 31. Data and SQL

Shade should make data workflows accessible without pretending SQL is unnecessary.

Possible direction:

```shade
data students from "students.csv"

query topStudents
    from students
    where score >= 80
    order by score descending
```

This may compile to or interoperate with SQL depending on the target.

Again, this is a research direction, not finalized syntax.

---

## 32. Education Without Lock-In

Shade's educational layer should support:

- board-neutral learning
- ZIMSEC
- Cambridge
- university
- polytechnic
- professional learning

Official board mappings must continue to follow the curriculum contract:

```text
board
→ qualification / level
→ subject
→ syllabus
→ objective
→ skill
→ exercise
→ evidence
```

Shade itself should remain board-neutral.

---

## 33. What Shade Must NOT Become

Shade should explicitly avoid several traps.

### Not a Python clone

Changing keywords is not innovation.

### Not VS Code with a new logo

Comp Lab already uses serious editor technology. Shade must provide a deeper computational model.

### Not an AI code generator

Cortex is a component of the system, not the definition of the language.

### Not a school-only toy

The architecture must support serious development.

### Not a fake universal compiler

Unavailable toolchains must be represented honestly.

### Not a curriculum hardcoded into syntax

Curriculum context belongs above the language semantics.

### Not a proprietary cage

Users should be able to export source, artifacts, and data.

### Not a giant first release

The first implementation must prove one coherent vertical slice.

---

## 34. The First Real Vertical Slice

Do **not** begin by attempting the complete compiler ecosystem.

The first slice should prove:

```text
Shade source
   ↓
Tokenizer
   ↓
Parser
   ↓
AST
   ↓
Semantic checks
   ↓
Shade IR
   ↓
Interpreter
   ↓
Structured execution result
   ↓
Comp Lab diagnostics
   ↓
Tests
   ↓
Learning evidence
```

Recommended first language surface:

1. variables
2. numbers / text / booleans
3. lists
4. arithmetic and comparisons
5. `if / else`
6. `while`
7. `for`
8. functions
9. `return`
10. `show`
11. `input`
12. basic tests

That is enough to prove the model without pretending we have a production language.

---

## 35. First Implementation Architecture

Potential repository structure:

```text
src/lib/shade/
├── lexer.ts
├── tokens.ts
├── parser.ts
├── ast.ts
├── types.ts
├── checker.ts
├── ir.ts
├── interpreter.ts
├── diagnostics.ts
├── tests.ts
└── index.ts
```

Future expansion:

```text
shade/
├── compiler/
├── runtime/
├── language-server/
├── formatter/
├── debugger/
├── package-manager/
├── targets/
└── stdlib/
```

The exact folder structure is not a commitment until implementation begins.

---

## 36. Standard Library Direction

The standard library should be small and principled initially.

Potential modules:

```text
core
math
text
collections
io
time
json
files
net
process
random
```

Privileged modules such as filesystem, network, process, camera, and microphone should remain capability-controlled.

---

## 37. Learning Graph Integration

Shade should emit structured events rather than writing directly into learning tables from the language runtime.

Conceptually:

```text
Shade Runtime
      ↓
Execution Events
      ↓
Cortex / Learning Evidence Layer
      ↓
Learning Graph
```

Example events:

```text
program.started
program.completed
program.failed
function.called
loop.entered
loop.completed
test.passed
test.failed
runtime.error
build.failed
```

Events must be versioned and privacy-aware.

---

## 38. Student Ownership

The student should be able to inspect what evidence was generated about their work.

The platform should avoid opaque claims such as:

> “Cortex says you are weak at loops.”

Instead, it should be able to explain:

```text
You attempted 7 loop exercises.
5 passed on the first run.
2 required corrections to loop boundaries.
Your latest attempt passed all tests.
```

This turns AI feedback into inspectable evidence.

---

## 39. Potential Long-Term Breakthroughs

If the foundation works, Shade could eventually enable capabilities such as:

### 39.1 Program-to-learning translation

A program can be analyzed into concepts and evidence without requiring a separate worksheet.

### 39.2 Learning-to-program translation

A curriculum objective can generate an environment, exercise, tests, and starter project around the same semantic model.

### 39.3 Cross-language understanding

Shade IR could become a common representation for understanding projects written partly in Shade and partly in existing languages.

### 39.4 Portable project intelligence

Project understanding could travel with the project instead of living only in one chat session.

### 39.5 Device-aware execution

The same project could select local, trusted, edge, or cloud execution based on capabilities and policy.

### 39.6 Explainable execution

Programs could be inspected at semantic level rather than only through raw logs.

### 39.7 Adaptive development environments

The environment could change its teaching depth without changing the underlying program.

---

## 40. Competitive Positioning

Shade should not attempt to win by being a slightly better editor than established IDEs.

The intended differentiation is:

| Existing approach | Shade direction |
|---|---|
| Source-code centric | Artifact + project centric |
| IDE separate from learning | Development + learning connected |
| AI reads source | Cortex receives structured context |
| Curriculum external to code | Curriculum can attach through context/evidence |
| Toolchain tied to machine | Capability-aware execution routing |
| Debugging shows errors | Debugging can explain semantic execution |
| Tests external | Testing can be first-class |
| Device is mostly implicit | Device capabilities are explicit |
| User history mostly external | Project and learning evidence can persist |
| One target at a time | Common IR with multiple targets |

This table describes the intended design direction, not a claim that every capability already exists.

---

## 41. Naming

**Shade** is a working name.

It is intentionally not treated as final until:

- trademark/domain considerations are investigated
- language/package ecosystem conflicts are checked
- the name works internationally
- the relationship to Shadecode is clear

The product surface remains **Comp Lab**.

The future physical facility remains **Shadecode Lab**.

Do not prematurely rename existing products around the working language name.

---

## 42. Non-Goals for the First Version

The first version should NOT attempt:

- a production-grade optimizing compiler
- every programming language feature
- native mobile compilation
- operating-system development
- full IDE replacement
- a package registry at launch
- unrestricted device APIs
- distributed computing by default
- autonomous AI code ownership
- official examination marking

These are potential future directions, not launch requirements.

---

## 43. Research Questions Before Syntax Freeze

Before implementing a serious parser, investigate:

1. Which language paradigms should Shade combine?
2. Should types be static, dynamic, gradual, or hybrid?
3. How should mutability work?
4. How should errors be represented?
5. What should equality mean?
6. How should nullability work?
7. How should generics work?
8. How should concurrency work?
9. How should memory management work?
10. How should native interop work?
11. What should Shade IR preserve?
12. How should packages be secured?
13. How should capability permissions be expressed?
14. Which target should be first beyond the interpreter?
15. What is the smallest feature set that proves Shade is genuinely useful?

These questions should be answered through design and experiments rather than intuition alone.

---

## 44. Definition of Success

Shade succeeds initially if a learner can:

```text
open Comp Lab
   ↓
create a Shade project
   ↓
write a small program
   ↓
run it
   ↓
inspect what happened
   ↓
write a test
   ↓
debug a failure
   ↓
understand the concept involved
   ↓
receive evidence-based guidance
   ↓
continue building
```

The first milestone is not “Shade replaces Python.”

The first milestone is:

> **Shade provides a computational experience that could not have been produced simply by putting an AI assistant inside an existing IDE.**

---

## 45. Build Roadmap

### Phase 0: Semantic design

- freeze principles
- define core values
- define statements/expressions
- define type model
- define error model
- define capability/effect model
- define project model
- define initial IR

### Phase 1: Minimal interpreter

- lexer
- parser
- AST
- checker
- interpreter
- diagnostics
- tests

### Phase 2: Comp Lab integration

- Shade environment in environment registry
- Monaco language support
- run/test panels
- structured diagnostics
- project persistence
- execution history

### Phase 3: Learning integration

- objective context
- evidence events
- trace/explanation views
- Learning Graph integration
- curriculum adapters

### Phase 4: Cortex integration

- structured program context
- explain
- diagnose
- teach
- project understanding
- learner-aware guidance

### Phase 5: Toolchain

- formatter
- language server
- CLI
- package system
- debugger
- build system

### Phase 6: Native targets

- WebAssembly
- desktop/native
- mobile
- trusted remote execution
- ShadeNet integration

### Phase 7: Ecosystem

- libraries
- package registry
- documentation
- community tooling
- migration/interoperability tooling

---

## 46. Immediate Next Step

The immediate implementation target is **not** a full compiler.

It is a minimal, testable **Shade Language Core** that proves the following loop:

```text
Shade source
→ parse
→ validate
→ execute
→ test
→ diagnose
→ explain
→ emit evidence
```

Only after that loop works should the language grow into applications, packages, native compilation, device control, or distributed execution.

---

## 47. Final Principle

Shade should exist because Shadecode can define a new relationship between programming and computing:

> **Code is not merely text to execute. It is a structured artifact that can be built, tested, understood, taught, deployed, and evolved.**

The language is the beginning.

The real invention is the computational model around it.
