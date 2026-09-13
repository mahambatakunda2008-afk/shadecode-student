# Shadecode Student Development Surfaces

This document defines the intended relationship between web, mobile, desktop and native execution across the entire product.

## One product, multiple surfaces

Shadecode Student is one platform with multiple surfaces rather than separate products that happen to share a backend.

| Surface | Primary strength |
| --- | --- |
| Web/PWA | instant access, broad compatibility, collaboration |
| Mobile | voice, camera, touch, quick capture, review |
| Desktop | precision editing, keyboard, multi-window workflows |
| Native companion | runtimes, filesystem, OS integrations, heavy computation |
| Edge/device node | offline services, local AI, school/local-network workloads |
| Cloud | optional synchronization and workloads that genuinely require remote infrastructure |

## Mobile is not a shrunken desktop

Mobile workflows should deliberately favor:

- voice commands and dictation
- camera and document capture
- handwriting and pen input
- visual manipulation
- guided step-by-step creation
- review and approval
- quick corrections
- context-aware actions

The mobile experience should avoid forcing long-form typing when another modality is more effective.

## Desktop is the precision surface

Desktop should provide the full editing experience for demanding work:

- professional keyboard shortcuts
- multi-file projects
- split views
- drag and drop
- external files
- native runtimes
- local databases
- developer tools
- precise design controls

## Native is a platform capability

Native is not synonymous with Comp Lab. The native layer may support any Student capability that benefits from device access or local computation.

Examples include:

- Comp Lab execution
- local AI models
- OCR and vision processing
- document generation
- media processing
- offline indexing
- filesystem workflows
- camera and microphone services
- notifications
- printing
- spreadsheet/document integrations
- local databases
- device-to-device services

## Shared artifact identity

A project or artifact should have one canonical identity regardless of the device used to create it.

```text
artifact ID
   |
   +-- content/version history
   +-- owner/collaborators
   +-- curriculum context
   +-- Cortex context
   +-- device history
   +-- tests/evidence
   +-- generated outputs
```

This enables a student to start with a voice instruction on a phone, continue designing on a laptop, execute locally through a native runtime, and review the result on the phone without creating separate copies of the project.

## Capability broker

UI components must not assume that a capability exists because the user is on a particular device.

They should query a shared capability broker that can return states such as:

- available locally
- available with permission
- available through native companion
- available on a trusted remote device
- available through edge node
- cloud-only
- unavailable
- intentionally disabled by policy

This prevents false Run, Export, Print, Scan, Execute or Generate controls.

## Interaction priority

For each task, Shadecode should prefer the lowest-friction trustworthy interaction:

1. direct touch/keyboard interaction when obvious
2. voice when typing is costly
3. camera/vision when the source is physical
4. local processing when possible
5. trusted nearby device when the current device lacks capability
6. edge processing when local devices are insufficient
7. cloud processing only when justified

The order is a design principle, not a hard rule. Privacy, performance, battery, cost and user permissions may change routing.
