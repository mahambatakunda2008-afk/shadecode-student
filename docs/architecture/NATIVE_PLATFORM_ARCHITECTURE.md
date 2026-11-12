# Shadecode Student Native Platform Architecture

**Status:** Architecture decision, initial baseline  
**Date:** 2026-11-12  
**Scope:** Windows, Android, iOS, iPadOS, macOS, Linux, and the existing web product

## 1. Product decision

Shadecode Student is one learning product delivered through multiple clients. The installed applications on each operating system must use that platform's native application framework and native interaction patterns.

A native client must not be a WebView wrapper around the Next.js website. The web application remains a first-class web client; it is not the implementation shortcut for desktop or mobile applications.

The product shares identity, academic data, curriculum definitions, backend contracts, and synchronisation rules. Each platform owns its UI, accessibility integration, storage adapter, lifecycle, permissions, notifications, and hardware integration.

## 2. Repository baseline verified on 2026-11-12

| Surface | Current evidence | Status |
|---|---|---|
| Web | Next.js application in `src/app` | Existing web client |
| Android | `android/`, Kotlin, Jetpack Compose, Room, DataStore, WorkManager | Native client exists; feature parity and release validation remain incomplete |
| Android WebView | Android README explicitly states the client does not embed the Next.js website in a WebView | No WebView-wrapper architecture intended |
| iOS / iPadOS | No native SwiftUI project found in repository root | Not yet implemented |
| macOS | No native macOS project found in repository root | Not yet implemented |
| Windows | No WinUI 3 / Windows App SDK project found in repository root | Not yet implemented |
| Linux | No GTK / Qt native project found in repository root | Not yet implemented |

The Android client already has native foundations: Compose UI, Room local persistence, DataStore, WorkManager, on-device OCR, and native Cortex-related components. Its README also explicitly records that its feature surface is smaller than the web client and that native feature parity, conflict resolution, and iOS remain outstanding.

The current Android entry point, `android/app/src/main/java/com/shadecode/student/MainActivity.kt`, is approximately 93 KB. This is a maintainability and modularisation risk to investigate before expanding the native feature surface.

## 3. Platform implementation decisions

| Platform | Native UI / application technology | Required platform integration |
|---|---|---|
| Windows 10/11 | C# + WinUI 3 + Windows App SDK | MSIX packaging, Windows notifications, file picker, camera, microphone, printing, app lifecycle, background tasks where supported |
| Android | Kotlin + Jetpack Compose (existing client) | Room, WorkManager, Android permissions/intents, notifications, camera, document picker, share sheet, Bluetooth/USB where supported |
| iOS | Swift + SwiftUI | SwiftData or SQLite, BackgroundTasks within OS limits, notifications, camera, Files, share sheet |
| iPadOS | Swift + SwiftUI with adaptive iPad layouts | Multitasking, keyboard/trackpad, Apple Pencil, Files, Stage Manager where supported |
| macOS | Swift + SwiftUI | AppKit interoperability where needed, menu bar, Finder/file access, notifications, printing, sandbox-aware permissions |
| Linux | GTK4 + Rust/GObject integration | Native desktop portal APIs, file chooser, notifications, printing, packaging for supported distributions |
| Web | Existing Next.js application | Browser APIs and PWA capabilities, without claiming browser-only capabilities are native |

Native does not mean every operating system exposes identical hardware or background capabilities. Each feature must be capability-detected, permission-aware, and implemented within the platform's actual security and lifecycle rules.

## 4. Shared product contracts

Do not attempt to share the UI across platforms. Share stable product contracts instead.

Canonical shared contracts must cover:

- Student identity, profile, school, level, curriculum, subjects, and preferences.
- Lesson catalogue, lesson content, prerequisites, completion, and mastery.
- Exam papers, components, attempts, question responses, marking, and recovery state.
- Study sessions, focus activity, timetable, tasks, streaks, achievements, and XP.
- Cortex memory, learning observations, recommendations, and explainability metadata.
- Offline content manifests, content versions, download state, and licensing metadata.
- Sync operations, idempotency keys, conflict metadata, tombstones, and server revisions.
- User-controlled appearance, layout, accessibility, and customisation settings.

Contract source of truth should be versioned and machine-readable (OpenAPI for HTTP APIs and JSON Schema for portable event/payload structures). Generate or validate client models against those contracts. Do not independently invent subtly different data models in Kotlin, Swift, C#, and Rust.

## 5. Offline-first data and synchronisation rules

Every native client must be useful without a continuous internet connection.

1. Store user-created work locally before attempting network synchronisation.
2. Use a durable local database and a transactional outbox for mutations.
3. Assign every queued operation a stable idempotency key.
4. Keep server revision / updated-at metadata and explicit conflict state.
5. Never silently overwrite a newer student answer, exam response, note, or preference.
6. Make retry safe after app termination, device restart, timeout, or duplicate delivery.
7. Cache curriculum and downloaded learning content with explicit version and integrity metadata.
8. Keep authentication refresh separate from access to already-cached local learning material.
9. Encrypt sensitive local data where platform facilities support it; protect backups and exported data deliberately.
10. Expose sync status and recovery actions to the student rather than hiding failures.

Initial sign-in and first content download may require connectivity. Once a student has authenticated and content has been downloaded, the app must preserve access to that content and locally stored work offline. Do not claim that cloud AI, new downloads, remote updates, or server-only services work offline.

## 6. Native feature capability matrix

Implement capabilities through platform adapters, not one global assumption.

| Capability | Windows | Android | Apple platforms | Linux |
|---|---|---|---|---|
| Local database and offline queue | Required | Existing foundation; harden | Required | Required |
| Camera / image capture | Supported devices | Native Camera APIs | AVFoundation | Portal/device support |
| OCR | On-device engine | Existing ML Kit foundation | Vision | Local OCR engine |
| Handwriting / stylus | Pen APIs where available | Stylus/input APIs | Apple Pencil / PencilKit | Tablet/input APIs |
| Microphone / dictation | Windows APIs | Android APIs | Speech / AVFoundation | PipeWire/portal |
| Notifications | Windows notifications | Android notifications | User Notifications | Desktop portal |
| Background sync | Windows-supported tasks | WorkManager | BackgroundTasks limits | User-session service |
| Files / import / export | Windows file pickers | Storage Access Framework | Files/document picker | GTK portals |
| Printing | Windows print APIs | Android print framework | Print framework | CUPS |
| Bluetooth / USB | Windows device APIs | Android APIs | Permission and accessory limits | BlueZ / udev permissions |
| Local AI acceleration | Hardware-dependent | NNAPI / vendor runtimes / CPU fallback | Core ML / Metal | ONNX / Vulkan / CPU fallback |

A capability is only marked complete after implementation and tests on the relevant OS and supported hardware. A library dependency or permission declaration alone is not completion.

## 7. AI and Cortex architecture

- Preserve the existing web Cortex router and provider gateway for the web client.
- Android keeps a native Cortex runtime and must route through a clear local-first policy.
- Define provider-neutral request, response, memory, tool, and event contracts.
- Separate model inference from student records and academic memory.
- Prefer deterministic/local capabilities for tasks that do not need a cloud model.
- Cache and retrieve prior generated learning material before spending a new model call.
- Use cloud providers only through trusted server-side routes; never embed provider secrets in a distributable client.
- Add platform-specific local inference adapters only when the model, device requirements, memory budget, licensing, and fallback behavior are documented.
- AI failure must not block ordinary study, downloaded lessons, exam attempts, or saving student work.

A shared Rust inference/core library is **not** an initial prerequisite. Revisit it only after repeated cross-platform logic has stabilised and a measured benefit outweighs FFI, build, debugging, and release complexity.

## 8. Delivery sequence

### Stage 0 — Architecture and baseline (this document)
- Record existing clients and gaps.
- Establish shared contracts and offline invariants.
- Preserve the existing Next.js and Android implementations.

### Stage 1 — Android native hardening and parity
- Audit the 93 KB MainActivity and split by feature, state, repository, and platform service.
- Map every web product capability against the native Android client.
- Prioritise student-critical flows: onboarding/auth, profile and subject setup, dashboard, lessons, exam attempts, answer persistence/recovery, timetable/focus, Cortex memory, settings/customisation.
- Verify offline behavior and conflict handling on real Android devices.
- Verify signed APK/AAB and release provenance separately from build success.

### Stage 2 — Windows native client
- Create a dedicated `windows/` WinUI 3 solution.
- Implement native shell, navigation, local database/outbox, authentication, settings, and student-critical workflows.
- Reuse the versioned backend contracts, not the web UI.
- Package and test as MSIX; validate installer, update, uninstall, file handling, notifications, keyboard, scaling, and offline recovery.

### Stage 3 — iOS and iPadOS native clients
- Create a SwiftUI application with adaptive iPhone and iPad experiences.
- Implement local persistence, offline queue, authentication, lessons, exam recovery, settings, and platform capabilities.
- Validate Apple Pencil and multitasking on supported iPads.

### Stage 4 — macOS native client
- Create a SwiftUI macOS application with native menus, keyboard shortcuts, window behavior, file handling, notifications, and printing.

### Stage 5 — Linux native client
- Create a GTK4 application with desktop portal integration and distribution-specific packaging.
- Define supported distributions and minimum versions before release commitments.

### Stage 6 — Cross-platform verification
- Run contract compatibility tests across clients.
- Test sync, duplicate delivery, conflicts, clock skew, low storage, offline launch, interrupted downloads, force-close recovery, and account changes.
- Verify accessibility, localisation, low-data behavior, performance, security, and update rollback per platform.

## 9. Definition of done for a native platform

A platform is not "native complete" merely because an installer or launcher icon exists.

It must have:

- A native UI and navigation system, with no website embedded as its primary application surface.
- Native application lifecycle, permissions, file access, notifications, and platform conventions.
- Local persistence and reliable offline access to previously downloaded content.
- Durable saving and crash/force-close recovery for student work and exam attempts.
- Sync queue, retry, idempotency, and conflict resolution.
- Shared student identity, curriculum, academic memory, and preferences.
- Feature parity tracked against an explicit matrix, with unsupported features honestly labelled.
- Automated tests plus real-device / real-OS smoke testing.
- Verified signed distribution artifacts, update behavior, and uninstall behavior.
- Accessibility, keyboard/screen-reader support, display scaling, and low-resource testing.

## 10. Non-goals and guardrails

- Do not replace the working web application just to achieve native clients.
- Do not wrap the Next.js website in WebView, Electron, or a browser shell and call it native.
- Do not rewrite the existing Android client from scratch.
- Do not launch all platform implementations simultaneously.
- Do not duplicate business rules or academic data contracts independently in every client.
- Do not promise identical hardware access or unrestricted background execution across operating systems.
- Do not mark a platform complete based only on a successful CI build.

**Immediate next implementation:** Stage 1, Android native architecture and feature-parity audit, followed by the Windows native client foundation.