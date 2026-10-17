# Shadecode Student platform-wide redesign

## Design direction

Use **Fluent Academic Workspace** as the foundation, borrowing the reading clarity of an editorial study product and the contextual awareness of an academic command centre.

The interface is neutral-first. Blue is reserved for primary actions, selected states, focus, and navigation. Violet is a secondary brand accent. Green remains semantic feedback for genuine success or completion, not a dominant decorative theme.

## Non-negotiable product principles

- Redesign the complete product, not only Learn or the dashboard.
- Preserve Supabase data, authentication, APIs, Cortex routing, lesson recovery, examination flows, offline storage, and existing user work.
- No mock data in place of real integrations, invented analytics, or fake progress.
- Primary actions must be visible near the decision or input they act on.
- Each screen should make its location, available action, and useful next step clear.
- Responsive behaviour, keyboard access, contrast, loading, empty, success, error, offline, and recovery states are part of the design.
- Review changes in a branch and validate the rendered application before merging.

## Repository surface discovered

The initial route inventory found roughly 80 application page/layout files across the following areas. This is a working inventory, not a claim that every screen has been fully redesigned.

### Public and account entry
- Marketing landing page and download page
- Login, sign-up, verification, password recovery, and password reset
- Onboarding and setup
- Offline, share, sync, and result/challenge routes

### Student workspace
- Dashboard and academic discovery
- Learn, lesson reader, quiz, lesson history, and paper learning
- Curriculum, subjects, study, revision, study plan, tasks, focus, and timetable
- Exam Hub, papers, question sets, saved papers, weak topics, contributions, and source pages
- Exam simulation and challenge workflows
- Workmate/Math Checker, Cortex, verification, Code Lab, Comp Lab, and projects
- Analytics, insights, achievements, leaderboard, careers, WhatsApp, and settings

### Administration
- Admin dashboard, analytics, AI usage, traction, careers, and feedback
- Exam Hub boards, questions, upload, moderation, and management
- Dedicated admin navigation and responsive navigation

### Shared product foundation
- Global styles and theme tokens
- Brand lockup and feature icon system
- Desktop sidebar, mobile navigation, admin navigation, shared shell
- Offline status, route guards, feedback, achievement notifications, Cortex command bar, and generation indicators

### Native application
- Inspect the Android/native application separately for parity, navigation, typography, controls, and responsive behaviour. Web styling must not be assumed to redesign native screens.

## Initial implementation findings

1. The global styles and the final brand refinement stylesheet contained overlapping visual overrides. The refinement layer has been consolidated into one neutral-first token and component system.
2. The public layout forced white text across public routes even when the background was light. It now uses the semantic foreground token.
3. Login and sign-up now use a shared responsive authentication surface and the actual Shadecode brand lockup.
4. The authenticated desktop sidebar has been widened from 240px to 256px to reduce cramped navigation labels.
5. Learn used a separate olive/green palette hard-coded throughout its main workspace. Those styles now use shared semantic tokens and a restrained blue/violet identity.
6. Learn's primary “Start learning” action now appears directly beneath the topic field rather than after the teaching-style cards. The default teaching mode remains available; students can still customise it.
7. The onboarding steps now use semantic blue/violet tokens rather than a separate cyan accent system, with a consistent dark setup surface.
8. The mobile student and admin navigation now share a quieter surface, safer focus treatment, and less dominant active Home tile.
9. Exam Hub now exposes its two most common actions at the top and uses the shared interactive-card system.
10. Math Checker has a shorter, action-first introduction; its working area is no longer pushed down by a large promotional header. Cortex Verify and the public landing page now use the shared blue/violet accent language.

## Redesign phases

### Phase 1: Shared foundation
- [x] Create a dedicated redesign branch.
- [x] Establish neutral-first design tokens and consistent shared components.
- [x] Correct public route foreground semantics.
- [x] Apply a shared authentication surface to login and sign-up.
- [x] Reduce cramped desktop navigation.
- [x] Replace Learn's hard-coded green theme and move the primary action next to the topic input.
- [ ] Verify the branch in a real rendered preview and fix any regressions.

### Phase 2: Core student journeys
- [ ] Dashboard: priorities, data hierarchy, next action, progress, and responsive layout.
- [ ] Learn: discovery, topic entry, generation states, library, lesson reader, quiz, and recovery.
- [ ] Exam Hub: discovery, paper/question flows, saved work, and weak-topic routes.
- [ ] Exam Simulator: distraction-free answering, timer, navigation, marking, results, and review.
- [ ] Cortex and Workmate: contextual assistance, input hierarchy, recovery, and meaningful status.
- [ ] Study plan, tasks, focus, timetable, progress, achievements, and leaderboard.

### Phase 3: Full-product parity
- [ ] Authentication edge states, onboarding steps, settings, account controls, and public landing page.
- [ ] Administration screens and workflows.
- [ ] Remaining specialist routes and secondary screens discovered in the repository.
- [ ] Native Android experience audit and applicable redesign.

### Phase 4: Quality assurance
- [ ] TypeScript and production build.
- [ ] Critical navigation and workflow checks.
- [ ] Responsive desktop, tablet, and mobile checks.
- [ ] Keyboard and focus checks, contrast review, and reduced-motion behaviour.
- [ ] Loading, empty, failure, offline, and recovery-state checks.
- [ ] Confirm existing backend integrations and user data remain intact.
- [ ] Inspect the actual deployed preview before merging.

## Completion standard

Do not call the redesign complete after a token change or a successful build. Completion requires a screen-by-screen review, working critical student journeys, responsive and accessible behaviour, preserved integrations, and inspection of the rendered deployment.


## Latest implementation pass
- [x] Shared interaction pass: consistent focus visibility, semantic input focus, responsive card/form safeguards, reduced-motion handling.
- [x] Dashboard hierarchy refinement: next action remains the focal point, supporting metrics collapse cleanly on smaller screens, and subject/focus cards receive keyboard focus treatment.
- [x] Timetable palette uses the blue/violet product language rather than a green-heavy subject palette; decorative emoji and duplicated duration icons removed from time controls.
- [x] Exam Simulator surfaces tightened to shared card geometry; selected multiple-choice answers use semantic primary glow rather than cyan.
- [ ] Build and rendered desktop/mobile QA still required. These changes remain on the redesign branch and are not released to production.

- [x] Lesson reader: removed the old olive theme from subject accents, difficulty labels, the empty-state link, and tutor surface; uses the shared semantic palette while preserving subject-specific icons and lesson content.

- [x] Study plan now uses the shared workspace page/header spacing and has legible plan-load error text in both light and dark themes.


## Latest Exam Hub workflow pass
- [x] Past-paper search has a programmatic label, descriptive accessible name, explicit clear-search control semantics, and debounce cleanup on unmount.
- [x] Question Bank filters have programmatic labels; errors are announced as alerts, and the no-results state links directly to the paper library.
- [x] Saved-paper primary action has a consistent minimum touch target and visible keyboard-focus treatment.
- [x] Weak-topic fetch errors are exposed with alert semantics for assistive technology.
- [ ] Continue auditing paper detail/attempt flows and validate interactions in a real browser at desktop and mobile widths.

## Latest core workflow pass
- [x] Learn's session-check and loading/error surfaces now use the shared light/dark semantic background and foreground tokens instead of hard-coded legacy colors.
- [x] Past-paper search ignores stale responses when the learner types quickly or clears the query, reports HTTP/network failures instead of presenting them as genuine zero-result searches, and announces the busy state to assistive technology.
- [x] Past-paper board/level/subject selection cards and document actions use raised neutral surfaces, shared focus treatment, minimum touch height, and restrained hover feedback.
- [ ] Verify these states in the rendered preview, then continue through paper detail/attempt flows, Learn generation/recovery, and Exam Simulator end-to-end.

- [x] Past-paper detail view now distinguishes not-found from transient load failures, offers an explicit retry, announces progress-save success/failure, and applies shared keyboard-focus and minimum-touch styling to actions.
- [x] Exam Simulation setup controls now use the shared focus ring, semantic raised surfaces, larger touch targets, and accessible alert styling for generation errors.
- [x] Exam Simulation level and question-count selectors now expose their selected state with `aria-pressed`, in addition to visible styling.
- [x] Fixed the dashboard watchdog's false-ready detection: its own loading skeleton no longer satisfies the rendered-dashboard selector, so a genuinely stalled dashboard can reach the recovery screen instead of spinning indefinitely.
- [x] Completed the dashboard watchdog fix end-to-end: the school dashboard now adds `data-dashboard-ready="true"` only after session bootstrap, and the watchdog ignores the generic loading shell when checking readiness. Foundation/beyond-school dashboards continue to use their explicit experience shell.
- [x] Learn session-check loading now uses shared semantic surface tokens and announces its status politely to assistive technology instead of hard-coded light/dark skeleton colors.


## Validation update (2026-10-16)
- [x] CI for head commit `98f3c22e69efbc9e1a20f742f7b30ce6023f8b24` passed TypeScript, lint, tests, and production build.
- [x] The matching Vercel preview reached READY. Anonymous smoke requests to the landing, login, sign-up, Learn, Exam Hub, Exam Simulator, Math Checker, Focus, Timetable, Study Plan, and Settings routes returned HTTP 200.
- [ ] These HTTP smoke checks do not prove authenticated interactions, browser-rendered layout quality, mobile breakpoints, or the complete lesson-generation workflow. Those still need real browser/session validation.
- [x] Cortex Learn generation policy fix: authenticated online requests now try the cloud/Cortex path before using a verified authored lesson; offline or unauthenticated requests may use exact curated recovery immediately. This prevents a known authored fallback from silently pre-empting AI generation for a signed-in online learner.
- [ ] PR remains draft and unmerged. Production has not been deployed by this redesign work.

## Static quality pass (no browser available)

Verified by script and unit test; rendered visual QA is still required.

- [x] Token contrast audited for light and dark (`npm run audit:contrast`, guarded by `src/lib/design/contrast.test.ts`). Light-theme status colours (success, warning, danger) and muted text darkened to reach WCAG AA 4.5:1.
- [x] In-shell `(app)/error.tsx` so one page crash keeps navigation usable; root `error.tsx` rebuilt on the same shared `RouteError` (previous version used hard-coded light text that was unreadable on the light theme and showed developer wording to students).
- [x] `(app)/loading.tsx` gives every student route an instant skeleton (there were no `loading.tsx` files before).
- [x] Skip-link target `#main-content` added to the main student layout (it only existed in admin and comp-lab layouts).
- [x] `prefers-reduced-motion` now also sets `animation-iteration-count: 1` (a 1ms duration alone made infinite animations flicker).
- [x] `min-h-screen` / `h-screen` upgrade to `dvh` where supported, with `vh` fallback, to stop mobile browser-bar layout jumps.
- [ ] Still needs a real browser: layout, spacing, mobile breakpoints, tap targets, authenticated flows. About 250 usages of text under 12px have not been reviewed.
