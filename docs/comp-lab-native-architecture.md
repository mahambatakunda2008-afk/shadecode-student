# Comp Lab Native Architecture

Comp Lab is a browser-first interface with a native execution layer. The browser is the UI and learning surface, not the limit of what Comp Lab can do.

## Why native

Browsers are excellent for web development, JavaScript, collaboration, lessons and low-friction access. They are not a truthful execution environment for every computing practical.

Comp Lab therefore separates:

- **Browser runtime**: safe, immediate execution for browser-capable languages.
- **Transpilation runtime**: source transformed into a browser target when that transformation is real and observable.
- **Native runtime**: real local/compiler/VM execution for languages and operating-system-specific projects.
- **Artifact environments**: real workbook/database/project files where execution is owned by the artifact application or compatible engine.

We must never make a browser implementation look like C#, VB.NET, Java, C/C++, Windows Forms, Access or Excel when it is not actually running that technology.

## Target architecture

```text
                       COMP LAB
                           |
              +------------+------------+
              |                         |
        Web / PWA UI              Native Companion
              |                         |
       Learning + IDE           Runtime Broker
       Curriculum Graph          Sandbox / Compiler
       AI / Diagnostics          OS integrations
              |                         |
              +------------+------------+
                           |
                    Unified Protocol
                           |
          +----------------+----------------+
          |        |        |        |       |
        JS/TS    Python    .NET     JVM    C/C++
          |        |        |        |       |
       Browser   Native   Native   Native   Native
```

## Native companion

The native companion should eventually be a lightweight Shadecode desktop application rather than requiring a heavyweight IDE installation for ordinary learners.

Responsibilities:

1. Detect installed runtimes and toolchains.
2. Execute projects in isolated working directories.
3. Enforce CPU, memory, process and time limits.
4. Stream stdout, stderr, exit status and diagnostics back to Comp Lab.
5. Return compiler/runtime diagnostics with source file and line information.
6. Support native project creation, build and test commands.
7. Provide OS-specific capabilities such as Windows Forms only when the host OS actually supports them.
8. Never expose arbitrary host filesystem access to a web page.

## Protocol boundary

The web application should communicate with a small versioned local protocol. A request contains a project manifest, files, entry point, language/environment, command intent and resource limits. A response contains structured events, diagnostics, exit status and generated artifacts.

The browser should be able to ask the native layer whether a capability is available before showing **Run** as an executable action.

## Runtime matrix

| Capability | Browser | Native target |
| --- | --- | --- |
| JavaScript | Yes | Optional |
| TypeScript | Transpile | Optional native toolchain |
| Python | No fake runtime | Real Python |
| C / C++ | No fake runtime | Real compiler |
| Java | No fake runtime | Real JVM |
| C# | No fake runtime | Real .NET |
| VB.NET | No fake runtime | Real .NET |
| Windows Forms | No | Windows + .NET |
| SQL | Sandbox/WASM candidate | Real database engines |
| Access | Artifact only | Windows/native integration |
| Excel | Artifact workflow | Native Office integration where available |
| Web | Yes | Optional local preview |

## Curriculum independence

The runtime layer is not tied to ZIMSEC, Cambridge or any other board. Curriculum data determines which environments are relevant to an objective. The runtime layer determines how that environment can actually execute.

```text
Board
  -> Qualification
  -> Level
  -> Subject
  -> Syllabus version
  -> Objective
  -> Practical requirement
  -> Environment
  -> Runtime capability
  -> Evidence / tests
```

This lets one Comp Lab support different boards without creating a separate IDE for each board.

## Native rollout

### Phase 1: contract

Create the runtime capability registry and protocol. Browser execution continues to work.

### Phase 2: desktop shell

Package the Comp Lab UI as a lightweight desktop application and expose only the native bridge required by Comp Lab.

### Phase 3: local runtimes

Connect Python, C/C++, Java and .NET through detected local toolchains with sandboxed execution.

### Phase 4: Windows practicals

Add native Windows Forms workflows and stronger Access/Excel artifact integration on Windows.

### Phase 5: portable native runtime

Provide equivalent native execution paths for Linux and macOS where the language/toolchain supports them, while keeping Windows-specific environments explicitly Windows-specific.

## Security rules

Native execution is a security boundary, not merely a convenience feature.

- No unrestricted shell execution from the web page.
- No unrestricted host filesystem access.
- Per-project working directories.
- Explicit executable allowlists.
- Timeouts and resource limits.
- Network disabled by default for student execution.
- Dependency installation requires an explicit capability and policy.
- Native bridge authentication/handshake is required.
- Every execution produces structured audit events.

The end state is not "a website that happens to launch commands." It is a learning IDE whose browser and native layers share one project model, one curriculum graph, one diagnostic model and one assessment evidence model.
