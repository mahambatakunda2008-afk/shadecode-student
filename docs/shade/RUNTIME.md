# Shade Runtime and Execution

## Current runtime

The current Shade runtime is an in-browser interpreter used by Comp Lab.

It provides:

- parsing
- execution
- stdout capture
- structured diagnostics
- exit status
- execution duration
- semantic analysis
- execution-plan metadata
- project metadata
- execution evidence

## Security boundary

The browser interpreter is **not** a security boundary.

It must not be used as the basis for executing untrusted privileged operations, accessing arbitrary local files, controlling devices, or making unrestricted network requests.

## Runtime contract

A runtime should receive a structured execution request and return structured results.

```text
Execution request
  ├─ project / entry artifact
  ├─ source or project artifacts
  ├─ language/runtime version
  ├─ declared requirements
  ├─ inputs
  └─ resource limits

             ↓

Approved execution target
             ↓

Execution result
  ├─ status
  ├─ exit code
  ├─ stdout/stderr
  ├─ diagnostics
  ├─ duration
  └─ evidence
```

## Runtime targets

Shade is designed to route work to different targets when the required capability exists:

1. browser/local sandbox
2. trusted personal device
3. trusted Shade node
4. school or edge node
5. optional cloud execution

The platform should choose the least powerful target that satisfies the requirements and policy.

## IR as the execution boundary

Shade IR is intentionally smaller than the source language. It should eventually allow multiple runtimes to consume the same semantic representation.

Future runtime targets include:

- browser interpreter
- isolated server sandbox
- native process runtime
- device runtime
- edge runtime
- distributed runtime

## Real toolchains

A language is not considered executable merely because Comp Lab can edit its source.

C, C++, Java, C#, VB.NET, Rust, Go, Kotlin, PHP, Windows Forms, Office workflows, and similar environments require their real toolchains or approved compatible runtimes.

If a toolchain is unavailable, Comp Lab must say so.

## Execution evidence

Execution should produce machine-readable evidence that can be consumed by testing, debugging, Cortex, and the Learning Graph.

Evidence should distinguish at least:

- learner/source error
- semantic error
- dependency error
- runtime error
- capability denial
- timeout/resource failure
- test failure
- infrastructure failure

These distinctions prevent the platform from telling a learner that their code is wrong when the runtime itself failed.
