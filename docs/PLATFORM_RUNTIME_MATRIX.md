# Shadecode Platform Runtime Matrix

The platform distinguishes supported concepts from currently available execution. A language, file format or workflow may be part of the product architecture without being executable in the browser today.

| Capability | Browser | Native | Edge | Cloud |
|---|---|---|---|---|
| JavaScript | Available | Available | Available | Optional |
| TypeScript | Planned transpilation | Available | Available | Optional |
| Python | Not faked | Real runtime | Real runtime | Optional |
| Java | Not faked | JVM | JVM | Optional |
| C | Not faked | Compiler | Compiler | Optional |
| C++ | Not faked | Compiler | Compiler | Optional |
| C# | Not faked | .NET | .NET | Optional |
| VB.NET | Not faked | .NET | .NET | Optional |
| SQL | Not faked | Isolated DB | Isolated DB | Optional |
| SQLite | Not faked | Native/local | Edge/local | Optional |
| Windows Forms | Not faked | Windows/.NET | Windows/.NET | Optional |
| Excel | Artifact workflow | Native integration | Trusted node | Optional |
| Access | Artifact workflow | Native/compatible | Trusted node | Optional |
| Web | Browser | Native webview | Edge preview | Optional |

## Routing

`local device -> trusted personal device -> trusted ShadeNet node -> school/edge -> optional cloud`

Routing is constrained by privacy, permissions, capability availability, battery, performance, cost and network policy.

## Product rule

No UI may claim that an unavailable runtime executed successfully. Unsupported execution returns a structured status explaining what is required and may offer editing, export or execution on a connected trusted runtime.
