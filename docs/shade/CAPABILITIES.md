# Shade Capabilities and Security

## Capability model

Shade separates **what a project needs** from **what the platform permits**.

```text
program
  ↓
required capability
  ↓
capability broker
  ↓
policy + availability + permissions
  ↓
approved execution target
```

A declaration such as `network.internet` is a requirement. It is not an authorization token.

## Capability contract

Every platform capability should eventually define:

- stable ID
- version
- supported platforms
- availability state
- required permissions
- input schema
- output schema
- resource limits
- privacy/security class
- network requirement
- fallback behavior

## Capability families

Planned capability families include:

### Compute

- JavaScript
- TypeScript
- Python
- JVM
- native C/C++
- .NET
- SQL
- Shade

### Device

- files
- camera
- microphone
- speech input/output
- OCR
- notifications
- background work
- printing
- USB
- Bluetooth
- local AI / hardware acceleration

### Network

- controlled Internet access
- APIs
- local network
- peer-to-peer communication

### Data

- SQLite
- PostgreSQL and compatible databases
- files
- spreadsheets
- structured datasets

## Trust levels

Human and AI actions should use explicit trust levels:

- `read-only`
- `draft`
- `mutating`
- `privileged`

The platform must not silently elevate a lower-trust action into a privileged operation.

## AI interaction

Cortex should operate through typed intents and capabilities rather than unrestricted shell access.

For example:

```text
Cortex: "Create a database table"
        ↓
intent: create
artifact: database
capability: database.sqlite
trust: mutating
        ↓
policy check
        ↓
execution
```

## Privacy classes

Future capability contracts should classify data access, for example:

- public
- project-local
- learner-private
- school-private
- sensitive
- privileged-device

The classification should affect logging, synchronization, sharing, and execution routing.

## Security rule

The platform should fail closed for privileged capabilities.

If a capability is unavailable, denied, or ambiguous, the execution target must not silently substitute a weaker or unrelated mechanism and claim success.
