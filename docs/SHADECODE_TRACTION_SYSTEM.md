# Shadecode Traction System

Date: 2026-08-16

## Purpose

Shadecode Student is treated as a product that must prove demand, not only a codebase that can ship features. The system connects the student experience, feedback collection, experimentation, analytics, exports, retention measurement, and operator decisions.

## Student-facing loop

Problem -> activation -> useful learning action -> repeat use -> measurable progress -> retention -> referral -> revenue.

The product promise is: **What should I do right now? Do it. See what I am weak at. Get the next useful action.**

## Onboarding

Onboarding remains short and progressively disclosed. It collects only information needed to personalize the first session and supports secondary, university, polytechnic/TVET and professional learners.

The first screen includes an optional instant-value demo: one deterministic math problem before setup is complete. This demonstrates value instead of presenting a feature tour.

Instrumented events:

- `onboarding_demo_opened`
- `onboarding_demo_answered`
- `onboarding_step_completed`
- `session_started`
- `activation_completed`

## In-app research

Students can receive lightweight surveys inside Shadecode. Surveys are dismissible and never block studying. Responses are stored separately for product research and admin review.

The initial survey covers:

1. Biggest current study problem
2. Perceived usefulness on a 1-5 scale
3. What should improve first

Authenticated survey responses are unique per survey/user, preventing accidental duplicate submissions.

## First-party analytics

The `traction_events` stream records authenticated user ID when available, anonymous ID, session ID, route, event name, small properties, and timestamp. Analytics failures never block learning.

Initial events include:

- `session_started`
- `page_view`
- `activation_completed`
- `onboarding_demo_opened`
- `onboarding_demo_answered`
- `onboarding_step_completed`
- `survey_completed`
- `output_exported`
- `result_shared`
- `challenge_created`
- `challenge_shared`

Browser-supplied identity is not trusted for authenticated events. The event endpoint derives the authenticated user from the Supabase session.

## Export system

Students can take useful work out of Shadecode. The reusable export layer supports JSON, CSV, TXT and browser Print/PDF.

The exam result surface now has a direct export action. The generic export menu can be reused by lessons, plans, saved questions, analytics and admin tools.

Authenticated exports are persisted in `export_logs`, while the lightweight event stream records the product action.

Priority export targets:

1. Exam results
2. Revision notes / generated lessons
3. Study plans
4. Saved questions
5. Progress summaries
6. Past-paper study records

## Retention measurement

The database now exposes an admin-only `get_traction_metrics()` function for D1, D7 and D30 retention, WAU, MAU, active learners over 7 days, export volume, survey volume and growth/share events.

Retention cohorts are based on a user's first `activation_completed` event and subsequent `session_started` events in the relevant day window.

The key metric is not registration count. It is repeated use of the core learning loop.

## Experiments

Experiments contain a stable key, hypothesis, variants, active state and timestamps. The assignment endpoint provides deterministic, sticky assignment for authenticated users using a SHA-256 bucket, so the same user receives the same variant for an experiment.

Admins can activate or pause experiments from the Traction Command Center. The initial `activation-first-session` experiment remains inactive until baseline data is understood.

Do not activate experiments merely because they sound plausible. Define the hypothesis, primary metric, guardrails, test window and decision rule first.

## Operator interface

`/admin/traction` is the first dedicated traction command center. It is protected by the existing admin role system.

It surfaces:

- total students
- WAU / MAU
- activation rate
- D1 / D7 / D30 retention
- 7-day event signals
- export volume
- experiment inventory and controls
- recent student feedback
- exportable event and feedback data

This is the foundation for the larger Shadecode operator console covering users, cohorts, content, AI health/cost, support, revenue, security and system health.

## Research rules

Validate separately with Cambridge/ZIMSEC secondary students, university students, and university/polytechnic/TVET learners.

Ask about observed behaviour, not hypothetical feature wishes: what they studied, what they used, what failed, what they paid for, and what they replaced.

## Guardrails

- Shipping a feature does not count as success.
- Growth claims require measurable events and cohort definitions.
- Surveys remain optional and lightweight.
- Analytics never blocks the learning experience.
- Admin surfaces use server-side role checks and RLS.
- Export endpoints never accept another student's identity from the browser.
- Existing low-end-device and offline-first requirements remain product requirements.
- Experiments stay inactive until their measurement baseline exists.

## Next product-validation phase

1. Instrument the highest-value learning actions across Learn, Exam Sim, Past Papers, Tasks and Cortex.
2. Wire exports into generated lessons, study plans and saved questions.
3. Add cohort/segment filters to the admin console.
4. Add survey creation/editing and audience targeting to the admin console.
5. Add experiment result dashboards and guardrail alerts.
6. Run a real student cohort and use the evidence to choose the next build.

The operating rule is: **build what the evidence demands.**
