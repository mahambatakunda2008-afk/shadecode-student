# Dashboard Component & Data Contract

## Purpose

Turn the Dashboard Reimagined direction into an implementation contract without locking the UI to today's component structure.

## Product job

The dashboard is the student's academic command center. Within seconds, a student should understand:

1. where they are in their academic journey;
2. what matters now;
3. what they should do next;
4. what needs attention;
5. how their momentum is changing.

The dashboard must not become a catalogue of Shadecode features.

## Experience hierarchy

### 1. Welcome context

A concise, contextual opening that establishes the student's current state. It should avoid generic greetings when a more useful piece of context is available.

Possible sources include today's date, current study goal, exam timeline, recent activity, or a meaningful progress change.

### 2. Next Best Action

The dominant action on the page.

Required data shape:

- action type
- title
- concise reason
- destination/action handler
- optional supporting metric
- confidence/source metadata where relevant

Rules:

- Never fabricate personalization.
- If no reliable recommendation exists, show a useful fallback action rather than fake intelligence.
- The CTA must be executable from the dashboard.

### 3. Momentum

A compact view of meaningful progress, not a wall of vanity metrics.

Potential signals:

- current streak
- recent mastery change
- completed sessions
- practice consistency
- exam preparation progress

Only show metrics that have trustworthy data.

### 4. Today's Plan

The student's actionable study sequence for the current day.

Each item should expose:

- subject/topic
- activity type
- estimated duration when available
- completion state
- primary action

The plan must gracefully handle no plan, partially generated plan, and failed loading.

### 5. Focus Area

One or a small number of areas that deserve attention based on actual evidence such as recent mistakes, mastery, assessment results, or explicit goals.

Do not present generic AI advice as a personalized weakness.

### 6. Upcoming Assessments

Relevant upcoming exams/assessments with dates and actionable preparation links.

No fake readiness score. If readiness cannot be calculated from trustworthy data, omit it.

### 7. Cortex Insight

Cortex should surface concise, actionable intelligence rather than a chatbot transcript.

Good examples:

- detected learning pattern
- recommended next action
- meaningful progress observation
- reminder about a weak area

Every insight must have an action or clear reason to exist.

### 8. Secondary analytics

Deeper analytics, achievements, leaderboard information, history, and other exploratory material belong below the primary learning workflow or on dedicated pages.

## Component boundaries

Preferred conceptual structure:

DashboardShell
- WelcomeContext
- NextBestAction
- Momentum
- TodaysPlan
- FocusArea
- UpcomingAssessments
- CortexInsight
- SecondaryAnalytics

These are conceptual boundaries. Reuse existing components where they already provide correct behavior; do not create wrappers merely for naming purity.

## Async contract

Each independent section must own its loading, success, empty, and failure states where practical.

Every asynchronous operation must terminate in one of:

- success
- actionable failure
- cancellation
- bounded timeout

Never allow a component to remain indefinitely in a loading state because a promise failed to settle.

A failed secondary section must not blank the entire dashboard.

Retry actions should retry only the failed operation where practical.

## Visual direction

The dashboard must be attractive as well as useful.

Design requirements:

- strong visual hierarchy
- deliberate spacing and density
- distinctive Shadecode identity
- restrained use of accent color
- clear typography hierarchy
- meaningful motion only where it improves comprehension
- polished cards/surfaces without turning every item into a floating rectangle
- clear primary/secondary action contrast
- responsive composition rather than desktop layout squeezed onto mobile
- accessible contrast and focus states
- reduced-motion support where applicable

Avoid:

- generic AI-dashboard aesthetics
- excessive gradients
- decorative metrics with no decision value
- card grids where a focused composition would be clearer
- emoji used as the primary information architecture
- animation that delays interaction

## Mobile priority

On narrow screens, the order should preserve the core learning loop:

1. context
2. next best action
3. today's plan
4. focus area
5. momentum
6. upcoming assessments
7. Cortex insight
8. secondary information

Mobile should not require horizontal scrolling for core content.

## Data integrity

The UI must distinguish between:

- known data
- unavailable data
- calculated data
- AI-generated recommendations
- stale/cached data

Do not convert missing data into reassuring numbers.

## Naming dependency

Student-facing terminology is currently a migration gate. Existing labels such as Tasks, Timetable, Exam Simulation, Math Checker, and AI Lesson Generation are legacy/current implementation labels until the historical blueprint naming decisions are recovered. Do not invent replacements and present them as historical decisions.

Once the approved terminology is recovered, apply it consistently across dashboard labels, navigation, CTAs, empty states, notifications, onboarding, and Cortex surfaces.

## Acceptance criteria

A dashboard implementation is not complete until:

- a student can identify the next useful action immediately;
- the primary action works;
- sections can fail independently;
- no user-visible async operation can spin forever;
- loading, empty, error, and retry states are intentional;
- the experience is responsive on mobile and desktop;
- no unsupported personalized claim is displayed;
- visual hierarchy is coherent and polished;
- terminology matches the approved product-language source once recovered;
- existing valuable functionality is preserved or deliberately migrated;
- tests and production verification cover the critical flow.
