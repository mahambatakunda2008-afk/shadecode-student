# Shadecode Native Platform Architecture

Shadecode Student is one platform with multiple execution surfaces. The web/PWA is the most accessible client, but it is not the platform boundary.

## Execution surfaces

```text
Shadecode Student
      |
  Web / PWA
      |
  Shared Platform Core
      |
  Capability Router
      |
  +---+---+---+---+
  |       |       |
 Local  ShadeNet  Cloud
 device  / edge   optional
```

Every major subsystem can use browser APIs, native device APIs, a trusted local companion, a trusted nearby node, school/edge infrastructure, or optional cloud services. Routing should consider capability, privacy, latency, cost, battery, connectivity, device resources and policy.

## Native is for the whole system

Native capabilities are not limited to Comp Lab. They include:

- offline-first storage and synchronization
- files and document handling
- camera, microphone, OCR and handwriting capture
- voice input and speech output
- local AI models and hardware acceleration
- background work and notifications
- printing and selected device integrations
- local databases and computation
- real programming runtimes and compilers
- large project builds
- trusted device-to-device communication

Each capability must have an explicit contract and permission boundary.

## Capability contract

A capability should describe:

```text
id
version
platforms
permissions
availability
input/output schema
resource limits
privacy class
network requirement
fallbacks
```

The web client must query capability availability rather than assuming native functionality exists.

## Routing policy

Prefer the smallest appropriate execution surface:

```text
LOCAL DEVICE
    -> TRUSTED PERSONAL DEVICE
    -> TRUSTED SHADE NET NODE
    -> SCHOOL / EDGE
    -> OPTIONAL CLOUD
```

Cloud is a capability, not the foundation of every feature.

## Product-wide impact

**Learn:** downloaded lessons, progress and selected AI workflows should remain usable offline.

**Cortex:** becomes a policy-driven router that can keep private or low-risk operations local when practical.

**Exam Sim:** exam state, timers and selected marking workflows should survive connectivity loss; camera/OCR can use native capabilities.

**Math / Work Checker:** can use camera capture, OCR, handwriting recognition and local mathematical engines.

**Focus:** native notifications and background capability can keep sessions reliable when the web app is suspended.

**Timetable:** native notifications and device calendar integration can improve reliability.

**Past Papers:** large papers and derived assets can be cached and served locally.

**Comp Lab:** real runtimes, compilers, builds and operating-system-specific environments use the native runtime layer.

**Voice:** becomes a first-class interaction surface for navigation, dictation, answer capture, code dictation, explanations and selected commands.

## Security boundary

Native execution must use explicit permissions, isolated working areas, resource limits, authenticated/versioned bridges, revocable device trust and auditable privileged operations. A web page must never receive unrestricted host access.

## Rollout

1. Define shared capability contracts and routing primitives.
2. Build a lightweight Shadecode native companion and secure browser-to-native handshake.
3. Move high-value local capabilities into the companion: files, voice, OCR, local data, notifications and real runtimes.
4. Add ShadeNet discovery and trusted personal-device federation.
5. Let Cortex make policy-aware local, peer, edge and cloud decisions across the product.

The goal is one Shadecode system that degrades gracefully from fully native to browser-only, rather than a collection of disconnected apps.
