# Shadecode Master Work Register & Sustainable Growth Plan

**Last reviewed:** 2026-10-27  
**Status:** Living register; work is not complete until implementation and acceptance evidence are recorded.  
**Purpose:** Consolidate current work, prioritize safe execution, and add a sustainable, privacy-respecting growth loop.

## Operating rules

1. The repository is the implementation source of truth; the master roadmap and approved blueprints are the strategic source of truth.
2. Before implementing an item, inspect current code, task records, open/merged PRs, issues, CI, and deployment state. Do not duplicate work already completed.
3. A plan, open PR, green build, or deployment attempt is not proof of end-to-end completion.
4. Use explicit statuses: **Critical/Blocked**, **In progress**, **Planned**, **Verified complete**.
5. Preserve working architecture and learner data. Production database/security changes require safe review and verification.
6. Never claim curriculum coverage, learning outcomes, privacy compliance, or product capability without evidence.
7. Growth must be consent-based and useful: no contact scraping, unsolicited mass messaging, fake reviews, review gating, astroturfing, or coercive review prompts.

## Architecture invariant: genuine offline capability, not a cache illusion

**Offline must not be defined as “the website shell and a few pages were cached.”** Shadecode should progressively work as a local-first application with durable, user-scoped local data, explicit sync, and honest capability boundaries.

- The Service Worker / Cache API is for static assets and safe shell resources only. It is not the source of truth for lessons, progress, mastery, answers, or learner memory.
- Use durable IndexedDB/local-first storage for explicitly supported offline data and operations, scoped by authenticated learner/device and protected against cross-account leakage. Preserve user work across reloads and offline sessions.
- Define one coordinated mutation log and sync contract: operation IDs/idempotency, ordering/version conflicts, retries with backoff, deletion/tombstone handling, account switching, and visible pending/synced/conflict states. Consolidate overlapping queues before expanding offline scope.
- Distinguish data that is available offline from actions that genuinely require a server, network, or model. Never pretend a server-side save, referral attribution, public review, or cloud generation succeeded while offline.
- Where practical, support real local computation and local teaching/practice packs. A local model is an optional capability only when the device can run it reliably; do not call static cached output “AI working offline.”
- On reconnect, sync safely and idempotently; do not silently overwrite newer work or duplicate lesson/progress events. Provide export/backup and recovery paths.
- Offline acceptance must test airplane mode, reload/reopen, queued writes, account switching, reconnect, conflicts, storage exhaustion, and recovery on a real supported device/browser. Measure the actual offline workflows, not just service-worker cache hits.

The existing audit at `docs/audits/2026-08-24-offline-sync-architecture-audit.md` found four overlapping/uncoordinated mechanisms and a built-but-unreachable encrypted local-first operation log. Resolve that architecture deliberately; do not add another cache/queue beside it.

## Priority 0: Establish current truth

- [ ] Read `docs/MASTER_SHADECODE_ROADMAP_2026-09-01.md`, `.cortex/tasks.md`, the active handoff, relevant audits, and open issue/PR state.
- [ ] Reconcile duplicated, superseded, merged, blocked, and genuinely unfinished work.
- [ ] Verify the latest commit, CI, Vercel deployment, and production commit.
- [ ] Reproduce the reported Learn generation/save/recovery failure in the deployed or a safe test environment.
- [ ] Verify the status of open Supabase security and authorization findings.
- [ ] Publish a single prioritized backlog with owners/dependencies and acceptance evidence.

## Priority 1: Reliability, security, and trust

### Learn and Cortex
- [ ] Trace lesson generation through routing, provider response, parsing, validation, persistence, and finalization.
- [ ] Fix retry/progress loops and misleading progress percentages.
- [ ] Verify provider configuration and bounded retry/recovery behavior.
- [ ] Preserve structured explanations, examples, practice, and answers.
- [ ] Reuse only verified, scope-matching shared learning artifacts before generating new content.
- [ ] Verify generate → save → reopen → practice → recover end to end.
- [ ] Verify learner-scoped memory, durable learning evidence, and failure diagnostics.
- [ ] Complete the evidence loop from observation to recommendation to measured outcome.

### Security and privacy
- [ ] Verify and remediate challenge-table grants, answer-key exposure, RLS, security-definer functions, and unscoped Cortex memory access.
- [ ] Verify subject eligibility and cross-user isolation across APIs and storage.
- [ ] Reconcile production migration history with tracked SQL before applying migrations.
- [ ] Verify feedback/admin authorization and server-authoritative quiz/assessment scoring.
- [ ] Complete an accurate data inventory and privacy/terms documentation.
- [ ] Implement and test data export/deletion and retention behavior.
- [ ] Ensure claims match real behavior and external-provider data handling.
- [ ] Never run destructive production tests.

## Priority 2: Complete the core learning product

- [ ] Verify lesson depth, curriculum alignment, source provenance, structured examples, practice, and answer validation.
- [ ] Verify Exam Hub and Exam Simulation, including question provenance, marking, timers, saved results, and recovery.
- [ ] Complete critical Paper-to-Learning flows: source extraction, OCR correction, visual grounding, question provenance, and mastery transfer.
- [ ] Verify Math Checker, Work Checker, calculator, and shared canvas workflows.
- [ ] Complete the Cambridge Computer Science pseudocode/algorithm studio and relevant practical learning workflows.
- [ ] Verify offline saved lessons, queued actions, retry/idempotency, conflict handling, and synchronization.
- [ ] Test keyboard/accessibility, responsive layouts, mobile, and real learner workflows.

## Priority 3: Curriculum and platform breadth

- [ ] Recover missing source text and ingestion evidence; reconcile curriculum records against source documents.
- [ ] Require evidence-backed promotion to verified curriculum status.
- [ ] Verify supported Cambridge and ZIMSEC subject/level/paper/topic coverage.
- [ ] Continue official Cambridge 2028–2030 syllabus monitoring.
- [ ] Build extensible subject/course/curriculum metadata and subject-specific teaching/assessment profiles.
- [ ] Clearly distinguish verified, partial, and planned subject support.
- [ ] Benchmark on-device model candidates before promoting local models to production.
- [ ] Finish Android packaging, signing, reproducible builds, installation, updates, and real-device testing.

## Priority 4: Design, public pages, and distribution

- [ ] Inspect repository history/assets to recover the preferred Shadecode icon; do not substitute an unrelated redesign.
- [ ] Fix icon consistency across landing page, application modules, browser/PWA assets, and deployed cache.
- [ ] Complete the platform-wide UI/UX audit without needlessly redesigning functioning modules.
- [ ] Update landing page, Products, Services, Insights, About, Contact, README, SEO metadata, and social previews.
- [ ] Ensure public claims match implemented capabilities.
- [ ] Verify production appearance after deployment.

## Priority 5: Sustainable self-growth and distribution

### A. Product-led sharing
- [ ] Map high-value share moments: a completed practice session, a personal milestone, a challenge result, a useful resource, or a verified progress card.
- [ ] Add an explicit **Share** action using the native device share sheet where available, with safe fallbacks.
- [ ] Offer user-initiated sharing through SMS, WhatsApp, and supported social apps; the user chooses the recipient/app and can edit the message.
- [ ] Use short, attributable links where practical, with privacy-respecting analytics and no sensitive learner data in URLs.
- [ ] Add referral attribution without rewarding spam or manipulating learning scores.
- [ ] Never upload/address-book contacts by default, auto-send messages, or message contacts without explicit user action.
- [ ] Add sharing controls, rate limits where needed, and abuse reporting.
- [ ] Measure share intent, successful share-link visits, activation, and retained referrals, not just clicks.

### B. Honest reviews and community reputation
- [ ] Ask for feedback after a meaningful, successful experience, with frequency limits and a dismiss option.
- [ ] Keep in-app product feedback separate from public review requests.
- [ ] Invite honest, voluntary reviews without requiring positive sentiment, offering prohibited incentives, or hiding the request from dissatisfied users.
- [ ] Never fabricate reviews, use staff/founder sockpuppets, astroturf communities, or pressure users to post.
- [ ] Follow each platform/community's rules; do not post promotional content where it is prohibited.
- [ ] Create a transparent response process for criticism and bug reports.
- [ ] Track review requests, voluntary review conversion, sentiment themes, and resolved issues without identifying users unnecessarily.

### C. Shadecode-owned blog and useful public resources
- [ ] Audit existing Insights/blog capability before building a duplicate system.
- [ ] Decide whether to extend the current Insights section or create a dedicated blog based on repository architecture.
- [ ] Build an editorial calendar around genuinely useful student needs: study methods, worked examples, syllabus changes, past-paper guidance, learning tools, and product updates.
- [ ] Make academic claims source-backed and distinguish official syllabus facts from advice/opinion.
- [ ] Publish useful free resources that demonstrate real product value, not thin SEO pages.
- [ ] Add author/editorial standards, correction process, publication dates, canonical URLs, sitemap/RSS where appropriate, and accessible page templates.
- [ ] Add contextual calls to action to try relevant features, without obstructing the educational content.
- [ ] Track organic discovery, useful-resource engagement, product activation, and return visits.

### D. Community and contact-based outreach
- [ ] Create channel-specific, community-rule-compliant launch messages.
- [ ] Let users share with chosen contacts through their own SMS/social apps; do not scrape contacts.
- [ ] Build a small list of relevant student communities and record each community's promotion rules.
- [ ] Prioritize useful answers, free resources, demonstrations, and feedback requests over repetitive advertisements.
- [ ] Ask moderators for permission when required.
- [ ] Create a repeatable founder outreach and follow-up tracker.
- [ ] Pilot with a small group before broad promotion; fix activation friction before scaling.

### E. Measurement
- [ ] Establish baselines for visitor → signup → first useful action → week-one return → referral.
- [ ] Instrument events with minimal data and documented retention.
- [ ] Define activation and retention clearly; don't treat downloads or signups as success by themselves.
- [ ] Run small experiments with one change at a time.
- [ ] Stop campaigns that create spam complaints or low-quality signups.
- [ ] Review growth results weekly and feed findings into the product backlog.

## Priority 6: Business and future products

- [ ] Verify founder/ownership, registration, financial tracking, support, and service-delivery foundations.
- [ ] Finalize Shadecode service offering and the School Communication System scope.
- [ ] Validate demand and pricing before expanding commercial commitments.
- [ ] Validate Discovery and Campus needs with real learners/institutions before broad implementation.
- [ ] Keep ShadeNet and other distributed capabilities behind evidence-based readiness gates.
- [ ] Keep Planet Repair as a separate workstream: material library, biomass evidence, water-treatment prototype, safe testing, and independently validated claims.

## Definition of done

A work item is **Verified complete** only when:
- its acceptance criteria are met in the actual implementation;
- relevant automated checks pass and their results are known;
- important user journeys are tested in a suitable environment;
- security/privacy implications are reviewed where relevant;
- production deployment is verified when the task is production-facing;
- documentation and this register are updated with evidence.

## Immediate execution sequence

1. Reconcile the authoritative roadmap, `.cortex/tasks.md`, issues, PRs, CI, and deployed commit.
2. Fix and verify the critical Learn generation/save/recovery path.
3. Verify and remediate high-priority security findings.
4. Finish the core learning journeys and curriculum evidence.
5. Restore the preferred icon and complete the public/product refresh.
6. Build product-led sharing, honest review requests, and the owned blog as measurable, consent-based growth loops.
7. Expand acquisition only after activation and reliability are measured.

## Growth north star

**Build something worth sharing, make sharing effortless and voluntary, earn honest public trust, and publish resources that help students even before they become users.**


## Subject management and learner personalisation

The focused implementation register is `docs/roadmaps/SUBJECT_MANAGEMENT_AND_PERSONALISATION_WORK_REGISTER_2026-10-27.md`. It tracks the web subject picker/API, central catalogue, per-learner curriculum profile, adaptive learning, Android alignment, and acceptance evidence. The initial API route is committed but **not yet verified end-to-end**; the web picker UI and deployment verification remain outstanding. Do not mark this work complete until the focused register's acceptance criteria are satisfied.


## 2026-10-27 subject-management decision and execution gate

The user explicitly requires broad subject support and personalization across learner level, selected subjects, qualification/board/syllabus, goals, demonstrated ability and learning history, with web and native Android aligned. The deliverable is a shared subject/curriculum contract and real subject-management workflow, not a Mathematics/Physics-only display or a larger hard-coded list.

The complete requirements, proposed taxonomy, implementation sequence, test matrix and current status are maintained in docs/roadmaps/SUBJECT_MANAGEMENT_AND_PERSONALISATION_WORK_REGISTER_2026-10-27.md. Cortex execution items are mirrored in .cortex/tasks.md.

Current truth as of 2026-10-27 (superseded by the detailed progress notes below):
- The initial web Subjects page had no add-subject UI; a searchable grouped picker, custom subject entry, add/remove-from-active-selection controls and a central selectable catalogue have since been committed.
- A per-subject curriculum editor has also been committed for board, qualification, level, and optional syllabus code/version.
- The implementation is in source, but CI, schema/RLS/trigger behavior, deployed browser flows, concurrency and account isolation remain unverified. Do not state that it is live or complete without evidence.
- Onboarding still uses a separate hard-coded per-level list; replacing it with the central catalogue and shared learner-profile contract remains open.
- Native Android Snap & Extract work does not automatically change the web app.
- Full global profile editing, adaptive personalization, subject-specific module integration, Android parity and deployed acceptance tests remain open.

Execution gate: verify the exact commit and audit profile/subjects source-of-truth behavior before release. Test add/duplicate/persist/relogin/remove, per-subject curriculum resolution and cross-account isolation. Catalogue presence must not be represented as verified curriculum or content coverage.


### Subject-management implementation progress (2026-10-27)

A first web implementation is now committed: the searchable grouped picker uses the central catalogue, supports catalogued/custom subject additions, and has a non-destructive remove-from-active-selection action. The authenticated API updates the profile selection and preserves existing subject rows so lesson/task references are not destroyed. A catalogue invariant test was added.

**Status remains In progress, not Verified complete.** Latest CI is pending at the time of this note. The deployed browser journey, schema/RLS behavior, trigger reconciliation, concurrency, cross-account isolation and persistence across relogin still need evidence. The catalogue means a subject can be selected, not that its syllabus, content, lessons or tools are verified and ready. Full curriculum-profile editing, adaptive learning and Android parity remain open.


### Per-subject curriculum settings (2026-10-27)

The web Subjects page now also includes a per-subject curriculum editor for board, qualification, level, and optional syllabus code/version. Explicit requested versions that do not match verified curriculum data are blocked instead of silently substituted. This is still in progress: the current source commit must pass CI, the identifiers must be verified against actual curriculum records, and the full signed-in browser flow must be tested. A unified global learner profile editor, adaptive mastery personalization and Android parity remain open.


## Cross-platform subject management and learner personalisation: current execution record (2026-10-27)

**Canonical detailed register:** `docs/roadmaps/SUBJECT_MANAGEMENT_AND_PERSONALISATION_WORK_REGISTER_2026-10-27.md`. The Cortex execution checklist is mirrored in `.cortex/tasks.md`. These documents record the full user-requested scope, initial subject taxonomy, per-subject curriculum requirements, adaptive-learning contract, privacy constraints, Android alignment, acceptance matrix, and evidence gates.

### Source status (not a release claim)
- [x] Central selectable subject catalogue and catalogue invariant tests committed.
- [x] Web Subjects page updated in source with searchable categories, catalogued/custom subject addition, non-destructive removal from active selection, and per-subject curriculum editor.
- [x] Authenticated subject API supports add/remove against the learner's profile selection; existing subject rows are intentionally preserved to avoid breaking lesson/task references.
- [x] Curriculum editor requires an explicit board and blocks explicit syllabus-code/version mismatches rather than silently substituting another version.
- [ ] Confirm latest exact-commit CI and tests.
- [ ] Review real schema, RLS, sync triggers, concurrency and partial-failure behavior.
- [ ] Test deployed web add/duplicate/refresh/relogin/remove and per-subject curriculum paths with account-isolation checks.
- [ ] Replace duplicated onboarding subject lists with the shared catalogue.
- [ ] Build one unified global learner profile editor for level, goals, language, preferences, programme/year and other relevant context.
- [ ] Wire learner level, per-subject curriculum, demonstrated mastery, misconceptions and goals into Learn, assessment, revision and subject-specific tools.
- [ ] Align Android subject selection, profile persistence and offline/sync behavior with the same contract.
- [ ] Verify content/curriculum truth labels and ensure selectable subjects are not presented as verified syllabus coverage or available lesson content.

**Release rule:** source commits and documentation are progress, not proof of a working deployed journey. Keep status **In progress** until the exact commit has green relevant CI and the end-to-end acceptance evidence above is recorded.