# Shadecode Student App Distribution Strategy

## Decision

Shadecode Student remains **web-first at its core**, but it will also become an installable application. The web application and backend remain the product foundation; Android and future desktop/mobile packages are distribution surfaces over the same Student system rather than separate products.

This direction responds to a recurring user expectation: students naturally ask whether Shadecode Student is available on the Play Store. Until official store distribution is ready, Shadecode should still provide a credible, official installation path.

## Initial Distribution Model

The first installable release does **not** need to wait for Google Play Store distribution.

### Canonical source

Shadecode should provide an official download page as the canonical entry point, for example a `/download` page associated with the Shadecode Student web presence.

The page should present:

- **Android APK** — direct installable release
- **Web / PWA** — existing browser-based experience
- **Desktop application** — when a supported desktop build is ready

### Release hosting

Use multiple distribution channels, with clear ownership:

1. **Official Shadecode download page** — canonical user-facing entry point.
2. **GitHub Releases** — primary technical release/artifact host and version history.
3. **Google Drive** — optional mirror for easy sharing and recovery.
4. **Dropbox** — optional secondary mirror.
5. **WhatsApp/direct sharing** — share the official download-page link rather than uncontrolled APK copies where possible.
6. **QR codes** — point to the official download page for events, posters, classrooms, and demonstrations.

Drive and Dropbox are mirrors, not the source of truth. Version numbers, checksums where appropriate, and release notes should remain consistent.

## Android Application

The first packaged application target is Android.

The Android app should reuse the existing Shadecode Student architecture and services wherever practical:

- existing Next.js application experience
- Supabase authentication and data
- Cortex and its API routes
- XP and progression systems
- lessons and AI learning
- exam simulation
- Math Checker
- tasks and timetable
- achievements and leaderboard
- existing offline/PWA capabilities where technically compatible

Do **not** create a second independent Student product or duplicate business logic merely to produce an APK.

Before choosing the packaging runtime, inspect the current application and existing Shadecode Core/Tauri work. Candidate approaches may include Capacitor or Tauri, but the choice is an engineering decision to be made from the actual repository architecture and required native capabilities, not assumed in advance.

## Release Requirements

An installable release should have:

- a signed APK
- a stable version number
- release notes
- a predictable download location
- installation instructions for users installing outside Google Play
- basic device testing on representative Android hardware
- working authentication and API connectivity
- working core Student flows
- a documented update path

The release process should avoid confusing students with multiple unofficial APK versions.

## Google Play Store

Google Play Store distribution is a **later phase**, not a prerequisite for the first installable release.

Once the Android build is stable, Shadecode can prepare the required store assets, package configuration, privacy/release documentation, and publishing workflow for Play Store submission.

The existence of an APK distribution path should therefore be treated as progress toward Play Store readiness, not as a replacement for it.

## Future Platforms

After Android distribution is stable, evaluate:

- Windows / desktop distribution
- iOS / App Store distribution
- stable and beta release channels
- automatic update mechanisms
- release telemetry and crash reporting
- signed artifact verification

These are future decisions and should not be treated as already-approved implementation details.

## Product Principle

The product should no longer be framed as **"only a website."**

The intended experience is:

> **Shadecode Student is one learning platform with multiple ways to use it: web, installable app, and eventually official app-store distribution.**

The web app remains the foundation. Packaging expands access without fragmenting the product.

## Scope Boundary

This document records a **product and distribution direction**, not a claim that the Android application, desktop application, Play Store listing, or automated release pipeline already exists.

Those items remain implementation work and must be tracked separately before being described as complete.
