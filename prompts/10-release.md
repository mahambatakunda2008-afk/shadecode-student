# SHADECODE STUDENT - RELEASE AND DISTRIBUTION PROTOCOL

## PURPOSE

Use this prompt when preparing Shadecode Student for release.

Examples:

- production deployment
- new version release
- APK creation
- PWA release
- desktop packaging
- store submission
- environment preparation
- launch checks

You must follow:

/prompts/00-master.md

---

# RELEASE REQUEST

Version:

[INSERT VERSION]

Release type:

- Web
- PWA
- Android APK
- iOS
- Desktop
- Multiple platforms

Changes included:

[LIST FEATURES]

Target users:

[WHO IS THIS RELEASE FOR]

---

# RELEASE PRINCIPLE

A release is not just code deployment.

A release includes:

- working software
- reliable installation
- updates
- security
- performance
- user experience

Never release something that has not been verified.

---

# PHASE 0: RELEASE ANALYSIS

Before releasing:

Inspect:

- application state
- build system
- dependencies
- environment variables
- deployment configuration
- platform requirements

Return:

## Release Report

Current status:

Potential blockers:

Required actions:

Risk level:

LOW / MEDIUM / HIGH

Do not release yet.

---

# PLATFORM STRATEGY

## 1. WEB APPLICATION

Requirements:

Check:

- production build
- routing
- authentication
- API connections
- environment variables
- performance

Target:

Fast loading.

Reliable experience.

Mobile compatibility.

---

# 2. PROGRESSIVE WEB APP (PWA)

Check:

- manifest
- icons
- service worker
- install prompt
- offline behaviour
- caching
- updates

Requirements:

Students should be able to:

- install from browser
- use on mobile
- access saved content offline

---

# 3. ANDROID APPLICATION

If creating Android APK:

Consider:

Options:

- PWA wrapper
- Capacitor
- Tauri mobile
- React Native
- other approved approach

Check:

- app permissions
- offline storage
- authentication
- API communication
- device compatibility
- performance

APK requirements:

- app name
- icon
- version number
- signing
- package identifier

Before generating:

Explain:

Chosen approach:

Why:

Trade-offs:

---

# 4. IOS APPLICATION

Future support.

Consider:

- Apple requirements
- signing
- App Store rules
- privacy requirements
- device testing

Do not implement without approval.

---

# 5. DESKTOP APPLICATION

Future support.

Possible approaches:

- Tauri
- Electron

Requirements:

- lightweight
- offline capable
- secure
- native experience

---

# BUILD VERIFICATION

Before release:

Run:

- production build
- type checking
- linting
- tests

Check:

- no broken imports
- no missing environment variables
- no runtime crashes

---

# DATABASE RELEASE RULES

Before production database changes:

Verify:

- migrations
- backups
- permissions
- existing user compatibility

Never:

- reset production data
- delete user records
- test destructive operations on production

---

# AI RELEASE RULES

Before releasing AI features:

Check:

- API keys
- fallback systems
- rate limits
- cost control
- failure handling

AI failure must not destroy the application experience.

---

# SECURITY CHECK

Before release:

Verify:

- secrets are protected
- authentication works
- permissions work
- user data is protected

---

# USER EXPERIENCE CHECK

Test:

New user:

Can they register?

Can they understand the app?

Can they complete first task?

Existing user:

Do they keep progress?

Do updates break anything?

---

# UPDATE STRATEGY

Every release should define:

Version:

Changes:

Migration requirements:

Rollback plan:

If something fails:

How can users recover?

---

# RELEASE CHECKLIST

## Code

[ ] Build successful

[ ] Tests passed

[ ] No critical errors

## Web

[ ] Production deployment works

[ ] Mobile browser tested

## PWA

[ ] Install works

[ ] Offline works

## Android

[ ] APK installs

[ ] App opens

[ ] Authentication works

## Database

[ ] Migration verified

## AI

[ ] Providers working

[ ] Fallback tested

---

# COMPLETION REPORT

Provide:

## Release Status

READY / BLOCKED

## Platforms Released

List:

## Version

:

## Changes

:

## Known Issues

:

## Rollback Plan

:

STOP.

Do not publish automatically.
