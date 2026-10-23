# Platform-Wide Shadecode Refresh: Baseline and Execution Plan

**Created:** 2026-10-23  
**Status:** Baseline started; this document is not a claim that the full audit or any runtime verification is complete.  
**Tracking issue:** #463

## Objective

Align Shadecode Student's public product story, public/account pages, authenticated learning workflows, Cortex architecture, repository documentation, and release quality. Improve the product without breaking existing learner data or replacing real integrations with mock content.

## Verified repository observations

- The repository is `mahambatakunda2008-afk/shadecode-student`.
- The root README describes Shadecode Student as a personal learning system and identifies Cortex as a shared learning-intelligence foundation.
- Public route group: `src/app/(public)`; the landing page is `src/app/(public)/page.tsx`. The public route group includes authentication and download areas.
- Authenticated application routes are organised under `src/app/(app)`; API routes are under `src/app/api`; administration routes are under `src/app/admin`.
- The README documents the canonical learning-event path through `POST /api/intelligence/events`, durable events in `public.cortex_events`, and the existing `topic_mastery` store. Changes must preserve this architecture unless a reviewed migration establishes otherwise.
- Platform-wide redesign PR #369 is merged. Its own record says TypeScript checks, 1,148 tests and a Vercel preview build passed at that time, but rendered visual QA on real devices and signed-in end-to-end flows were not verified.
- Learning-reliability PR #456 is still a draft in the observed repository state; its own record says the regression test, typecheck, lint, full test suite, production build, replay/idempotency checks and authenticated browser verification remain pending.
- Shared learning-artifact cache PR #464 is a draft and states that no production migration has been applied. It must not be treated as shipped or production-ready until its review and release gates pass.
- The master tracking issue is #463.

## Important evidence rule

Repository documentation, a merged PR, a green build, a preview URL, and a successful production user workflow are different kinds of evidence. Mark a capability as verified only when the relevant check was actually run and its result recorded.

## Execution sequence

### 1. Reliability and current release state
- [ ] Inspect current open PRs, CI checks, Vercel deployment status, and production commit.
- [ ] Review the current lesson-generation implementation and existing recovery/lease behaviour.
- [ ] Reproduce or obtain reliable evidence for reported lesson-generation failures.
- [ ] Verify generation → persistence → reopen → completion in an authenticated workflow.
- [ ] Review PR #456 and PR #464 for overlap, dependency order, migration safety, and test evidence.
- [ ] Do not apply a database migration or merge a draft solely because the design is promising.

### 2. Public page and acquisition audit
- [ ] Read the current landing page and public layout/metadata.
- [ ] Inventory all public, download, authentication, onboarding, recovery, offline and error routes.
- [ ] Check every primary CTA and important navigation link.
- [ ] Compare every product claim with verified product behaviour.
- [ ] Check page metadata, social previews, indexing rules, accessibility and responsive layouts.
- [ ] Make focused improvements on an isolated branch; do not replace the existing page without a route-level review.

### 3. Authenticated product audit
- [ ] Inventory dashboard, Learn, Exam Hub, Exam Simulation, Cortex, Math Checker, study planning, tasks, timetable, focus, settings and specialist routes.
- [ ] Prioritise broken or misleading workflows before visual polish.
- [ ] Check loading, empty, error, offline and recovery states.
- [ ] Validate desktop and mobile layouts, keyboard access, focus visibility, contrast and reduced motion.
- [ ] Confirm subject availability is restricted to the learner's selected/eligible subjects where required.

### 4. Repository and documentation alignment
- [ ] Update README only after confirming current features and setup instructions.
- [ ] Reconcile product vision, master roadmap, capability registry and status records.
- [ ] Label capabilities as shipped, partial, planned or unverified.
- [ ] Check screenshots and public-facing repository description.
- [ ] Verify security, privacy, contribution and testing instructions.
- [ ] Avoid claiming traction, partnerships, certifications, outcomes or availability without evidence.

### 5. Release validation
- [ ] Typecheck.
- [ ] Lint.
- [ ] Targeted regression tests and full test suite.
- [ ] Production build.
- [ ] Database migration/RLS/idempotency/replay checks for relevant changes.
- [ ] Rendered preview inspection on desktop and mobile.
- [ ] Authenticated end-to-end checks for critical workflows.
- [ ] Record remaining limitations and deployment status.
- [ ] Merge/deploy only after the relevant acceptance criteria pass.

## Product and design guardrails

- Preserve existing user work, Supabase data/RLS, authentication, APIs, Cortex routing, lesson recovery, exam workflows and offline/PWA behaviour.
- Do not introduce mock data in place of real integrations or invent progress/analytics.
- Keep the interface a focused academic workspace, not a generic chat-first redesign.
- Keep visual changes consistent with the existing Fluent Academic Workspace direction: neutral-first surfaces, restrained blue primary actions, violet as a secondary accent, and semantic success colours.
- Keep icons consistent and purposeful; avoid decorative clutter.
- Build for low-bandwidth and mobile use as well as desktop.
- Prioritise the cost per successfully completed learning task, not AI calls or feature count.

## Completion report format

For every workstream, record:
1. Files and routes changed.
2. Tests/checks actually run and their results.
3. Preview or production environment checked.
4. What remains unverified.
5. Risks, migrations, and rollback path.
6. Whether the change is ready for review, merge, or deployment.

A workstream is not complete merely because code or documentation was edited.
