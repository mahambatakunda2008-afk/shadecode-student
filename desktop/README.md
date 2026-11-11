# Shadecode Student Desktop

This directory contains the dedicated desktop application, built with **Tauri 2 and Rust**. It is a separate installable client, not merely a browser shortcut and not an Electron bundle.

## Current foundation

- Native desktop window and application identity.
- Windows, macOS and Linux packaging targets.
- A local startup screen that checks connectivity and opens the authenticated Shadecode Student web experience.
- No privileged JavaScript-to-Rust commands are exposed to the remote web application.
- The web application remains the source of truth for accounts, learning state, curriculum, Cortex and synchronization.

The first foundation intentionally reuses the deployed Next.js application inside the native system webview. This avoids duplicating the learning product or inventing a second account/data architecture while the shared platform is being stabilized.

## Honest current limitations

This is the desktop-client foundation, **not the completed native desktop experience**.

- A first launch requires internet access.
- Most application UI is currently served by the web deployment.
- The desktop shell does not yet provide a complete local offline workspace, background sync engine, native file integrations, global shortcuts, system notifications or native update channel.
- Desktop-specific UX and keyboard workflows still need implementation and acceptance testing.
- The app has not yet been packaged, signed, or tested on physical Windows, macOS and Linux machines.

Do not describe this foundation as full offline support or as a feature-complete desktop release.

## Build prerequisites

Install Rust (stable), the platform's Tauri prerequisites, and the system webview dependencies.

- Windows: Microsoft C++ Build Tools and WebView2 Runtime.
- macOS: Xcode Command Line Tools.
- Linux: WebKitGTK 4.1 and the Tauri system libraries.

From the repository root:

```bash
cargo check --manifest-path desktop/Cargo.toml
cargo run --manifest-path desktop/Cargo.toml
```

For distributable installers, install the Tauri CLI v2 and run:

```bash
cargo install tauri-cli --version "^2.0.0" --locked
cd desktop
cargo tauri build
```

## Product acceptance gates

1. Build and package Windows, macOS and Linux clients in CI.
2. Verify authentication, logout, account switching and persistent sessions.
3. Verify every subject and learning workflow available on web is accessible from desktop.
4. Add desktop navigation, keyboard shortcuts, file/document handling and system integration.
5. Implement and test a local-first desktop data layer, offline content and deterministic sync before claiming offline parity.
6. Add signed installers, update strategy, crash reporting and release provenance.
7. Test on real devices and supported OS versions before release.

The web and desktop clients must share canonical subject IDs, curriculum records, learner identity and learning-event contracts. Desktop must not fork the subject catalogue or silently invent separate progress.
