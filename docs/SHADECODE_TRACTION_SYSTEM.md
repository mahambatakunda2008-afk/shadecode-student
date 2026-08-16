# Shadecode Traction System

Date: 2026-08-16

## Purpose

Shadecode Student is now treated as a product that must prove demand, not only a codebase that can ship features. This system connects the student experience, feedback collection, experimentation, analytics, exports, and operator decisions.

## Product loop

Problem -> activation -> useful learning action -> repeat use -> measurable learning progress -> retention -> referral -> revenue.

The core product promise remains student-first: **What should I do right now? Do it. See what I am weak at. Get the next useful action.**

## Student-facing surface

- Mission Control / today's next action
- Cortex AI and learning assistance
- Exam Simulation
- Past Papers
- Math Checker
- Tasks and timetable
- Progress, mastery and streaks
- Export/share outputs
- In-app feedback and surveys
- Clear account/settings controls

## Onboarding

The onboarding flow stays short and progressively disclosed. It collects only information needed to personalize the first session, while supporting secondary, university, TVET/polytechnic and professional learners.

The first screen now contains an optional instant-value demo. The demo is deliberately deterministic and fast: the student can solve one small math problem before completing setup. The goal is to demonstrate the product loop rather than explain a feature list.

Instrumentation:

- `onboarding_demo_opened`
- `onboarding_demo_answered`
- `onboarding_step_completed`
- `session_started`
- `activation_completed`

## In-app research

The product can deliver lightweight surveys without sending students to an external form. The first seeded survey asks:

1. Biggest current study problem
2. Perceived usefulness (1-5)
3. What should improve first

Survey responses are stored separately from general feedback so qualitative research can be segmented and exported. Surveys must remain dismissible and must never block studying.

## Product analytics

A first-party `traction_events` stream records product events with:

- authenticated user ID when available
- anonymous device identifier
- session identifier
- route
- event name
- small JSON properties object
- timestamp

Analytics failures are intentionally non-blocking. User-supplied identity from the browser is never trusted by the ingestion endpoint; the server derives the authenticated user from the Supabase session.

Initial events include:

- `session_started`
- `page_view`
- `activation_completed`
- `onboarding_demo_opened`
- `onboarding_demo_answered`
- `onboarding_step_completed`
- `survey_completed`
- `output_exported`

## Operator interface

`/admin/traction` is the first dedicated traction command center. It is protected by the existing database role system and is intended for product operation, not student use.

It surfaces:

- total student count
- event volume
- survey response volume
- activation signal
- event distribution
- latest feedback
- experiment inventory
- exportable event/feedback data

This should grow into the broader Shadecode operator console covering users, content, AI health/cost, support, growth, experiments, revenue, security and system health.

## Experiments

The database now supports named experiments with:

- stable key
- hypothesis
- variants
- active/draft state
- user/device assignment

The first seeded experiment is `activation-first-session`. It is intentionally inactive until the instrumentation baseline is understood.

Do not activate experiments merely because they sound plausible. State the hypothesis, define the primary metric, define the guardrails, run the test, then decide.

## Exportable outputs

Students should be able to take useful work out of Shadecode instead of trapping it inside the app. The reusable export layer supports:

- JSON for structured reuse
- CSV for tabular study data
- TXT for portable notes
- Print/PDF through the browser print flow

Priority export targets:

1. Exam results
2. Revision notes / generated lessons
3. Study plans
4. Saved questions
5. Progress summaries
6. Past-paper study records

Every export emits `output_exported` for product measurement.

## Retention measurement

The next analytics iteration must add cohort calculations rather than relying on vanity counts:

- activation rate
- Day-1 retention
- Day-7 retention
- Day-30 retention
- weekly active users
- repeat learning sessions
- exam attempts per active learner
- past-paper usage
- export/share rate
- referral rate
- free-to-paid conversion
- churn

The key question is not "How many registered?" but "How many students repeatedly return for the core learning loop?"

## Research priorities

Validate separately with:

- Cambridge/ZIMSEC secondary students
- university students
- university/polytechnic/TVET learners

Ask about real behaviour: what they studied, what they used, what failed, what they paid for, and what they would replace. Avoid asking students to design the product for us.

## Guardrails

- No feature is considered successful because it was shipped.
- No growth claim is accepted without a measurable event or cohort definition.
- Surveys remain optional and lightweight.
- Analytics must not block learning or create unnecessary personal-data collection.
- Admin surfaces must use server-side role checks and RLS.
- Export functions must never expose another student's private data.
- Existing low-end-device and offline-first constraints remain product requirements.

## Next build sequence

1. Instrument the highest-value learning actions beyond the initial global signals.
2. Wire `ExportMenu` into exam results, lessons, plans and saved questions.
3. Expand `/admin/traction` into users, cohorts, feedback, experiments and AI/system health.
4. Add cohort retention queries and trend cards.
5. Add experiment assignment and result calculation UI.
6. Run a real student cohort and use the evidence to choose what to build next.

The rule for the next phase is simple: **build what the evidence demands.**
