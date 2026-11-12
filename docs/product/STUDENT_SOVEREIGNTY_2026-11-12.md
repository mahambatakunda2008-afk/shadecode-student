# Student Sovereignty

**Status:** initiative opened 12 November 2026  
**Tracking issue:** #573  
**Scope:** offline independence, student-controlled UI, and intent fidelity

## Product principle

The learner controls the learning objective, the learning environment, and the way the system responds. Shadecode supplies capability without silently taking control away from the learner.

This document is an implementation contract. It does not assert that the capabilities below are already complete.

## Student requirements

### A. Offline independence

The core learning experience must remain useful without an internet connection after the required application and content have been installed or downloaded.

Required local capabilities:
- Read locally available lessons, notes, resources and downloaded examination papers.
- Create, edit and retain notes and learner work.
- Attempt supported examinations with saved answers, timers and force-close recovery.
- Use deterministic/local learning tools where implemented, including supported mathematics, graphing and diagram workspaces.
- Preserve progress, study plans and learner preferences locally.
- Provide local handwriting recognition and local AI only when an appropriate model/runtime is actually present on the device.
- Synchronize changes safely after reconnection, with explicit conflict handling and no silent data loss.

Every capability must carry an honest availability state:
- **Offline-ready:** verified in airplane mode.
- **Download required:** works offline after an explicit content/model download.
- **Online-only:** requires a remote service or live connection.
- **Unverified:** not yet proven.

A cached shell or cached page is not proof of a complete offline workflow. Cloud AI and external video must never be described as offline.

### B. Student-controlled UI

Learners should be able to configure and retain:
- Dashboard widgets: visibility, order and configuration.
- Navigation: visibility and order of eligible modules.
- Appearance: themes, colour, typography, spacing and information density.
- Learning workspace: layout and visible tool panels.
- Notifications: categories and schedules.
- Accessibility preferences.
- Export, import and reset of personal configuration.

Preferences should work offline and synchronize safely when online. Customization cannot bypass role permissions, subject eligibility, curriculum rules or safety boundaries. Provide sensible defaults and a reliable reset.

### C. Intent fidelity

Cortex must preserve explicit instructions and constraints:
- Exact quantities, formats, subjects, topics, difficulty and requested method.
- No extra content that violates a stated constraint.
- Clarification when a material instruction is genuinely ambiguous.
- Validation of generated output against the request before it is shown.
- User-controlled persistence, editing and reset of preferences.

If a learner asks for exactly five questions, the system must return exactly five or clearly explain why it cannot. It must not silently substitute a different quantity, topic, subject or method.

## Existing implementation evidence to reconcile

The following work already exists in the repository's current PR history. It must be integrated and re-audited rather than duplicated:

| Work | Existing evidence | Remaining boundary |
|---|---|---|
| Subject catalogue | PR #567 adds ZIMSEC FRS 4047 and Cambridge Business 9609, Economics 9708 and Geography 9696 identities, plus readiness layers. | Catalogue presence is not complete syllabus, lesson, assessment, tool or offline-pack coverage. |
| Teacher tutorials | PR #569 caches selected tutorial text and downloaded image/diagram/audio assets. | External video remains online-only; full offline content packaging is not established. |
| Desktop client | PR #568 establishes a Tauri 2 shell. | First launch and most UI remain internet-dependent; no complete local workspace/sync engine yet. |
| Persistent student context | PR #572 adds an authenticated student-context resolver. | Fresh CI, signed-in behavior and RLS/account-isolation end-to-end verification remain required. |
| Offline exam generation | PR #561 restores deterministic multi-topic exam generation and Classic no-AI mode for covered topics. | This is not local generative AI and does not prove every subject/topic is covered offline. |

## Curriculum work remains independently tracked

- **ZIMSEC O Level Family and Religious Studies (FRS), 4047:** still requires authoritative syllabus PDF/version discovery and verified topic/content coverage. Do not treat catalogue visibility as completion.
- **Cambridge A Level Business, 9609:** official structure and assessment mapping are being established; full outcome transcription, lessons, question coverage, tools and offline pack still require evidence.
- **Cambridge A Level Economics, 9708:** AS outcome registry exists but is source-extracted and not independently reviewed; complete A Level and content/assessment/tool/offline coverage remain separate gates.
- **Cambridge A Level Geography, 9696:** preserve the 2027–2029 syllabus structure and option rules; full reviewed outcome and learning-content coverage remain separate gates.

For every subject, report these dimensions independently: identity/catalogue, official syllabus source/version, topic/outcome coverage, lessons, assessments, subject tools and offline pack.

## Proposed architecture boundaries

Do not create parallel learner identities or duplicate the canonical subject catalogue.

1. **Local Learning Runtime:** device-local persistence, content registry, local tools, download management and offline workflow orchestration.
2. **Sync and Conflict Layer:** queued writes, idempotency, versioning, retry, conflict visibility and safe account boundaries.
3. **Student Experience Preferences:** versioned, validated UI and accessibility preferences with local-first persistence and optional sync.
4. **Intent Contract:** structured constraints extracted from a request, explicit ambiguity handling and output validation.
5. **Cortex Memory:** user-approved durable preferences and learning context, separated from transient prompts and protected by existing identity/RLS boundaries.

These are logical responsibilities, not a requirement to create five independent services.

## Delivery plan

### Phase 0: Evidence audit
- Inventory service-worker/PWA caching, IndexedDB/Room storage, local files, offline routes and every network-dependent workflow.
- Trace web, Android and desktop differences.
- Classify each capability using the four availability states above.
- Identify data ownership, sync paths, account switching and logout/deletion cleanup.
- Produce a dependency map and reproducible airplane-mode test plan.

### Phase 1: Local data reliability
- Define local data ownership and schema/version migrations.
- Verify persistence after refresh, force-close and device restart.
- Add safe sync queues, idempotency and conflict resolution.
- Test reconnect, account switching, logout and account deletion boundaries.

### Phase 2: Student-controlled interface
- Implement a typed, versioned preference model.
- Add dashboard widget show/hide/reorder/configuration.
- Add navigation ordering/visibility while enforcing eligibility.
- Add theme, typography, density and workspace controls.
- Persist locally; test import/export/reset and synchronization.

### Phase 3: Intent fidelity
- Define a structured request-constraint contract.
- Enforce exact counts and explicit subject/topic/method constraints in deterministic generators.
- Add validation and clear failure responses to AI-generated outputs.
- Add regression tests for conflicting, ambiguous and impossible requests.
- Add user-controlled preference memory and controls.

### Phase 4: Verified offline coverage
- Close offline workflow gaps by client and subject.
- Separate local deterministic capability from local model capability.
- Bundle/download only appropriately licensed and sized content/models.
- Test complete workflows in airplane mode on supported devices.

### Phase 5: Curriculum completion and release acceptance
- Resolve FRS 4047 authoritative source and complete verified curriculum intake.
- Complete the four reported subjects with independent evidence for each readiness dimension.
- Run desktop, web/PWA and Android acceptance suites, including real-device tests.

## Release gates

No feature may be called fully offline until its complete user workflow passes airplane-mode tests. No subject may be called complete based only on catalogue presence or topic titles. No request may be considered faithfully fulfilled unless its explicit constraints are validated or a clear inability/clarification is returned.

## First implementation task

Complete Phase 0 before selecting storage or sync changes. The repository already contains multiple offline mechanisms; an evidence-based dependency map is needed to avoid replacing working local functionality or introducing a second data model.
