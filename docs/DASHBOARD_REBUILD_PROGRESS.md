# Dashboard Rebuild Progress

## Current pass

The dashboard has moved from the documented Dashboard Reimagined concept into an implemented Academic Command Center composition.

### Implemented

- Command-center page shell
- Contextual greeting (real data-grounded: new-user, exam-approaching, active-streak, returning-after-gap, or neutral time-of-day fallback -- was previously always just the time-of-day fallback; see 2026-08-15 entry below)
- Primary Next Move surface
- Momentum metrics
- Today's Plan
- Next Up / upcoming assessments
- Focus Area
- Integrated Cortex surface
- Bounded Cortex timeout and retry state
- **Independent fetch boundaries** (2026-08-15): momentum/subjects/recently-touched no longer depend on the same request as the Cortex-touching intelligence call -- a failed/slow intelligence fetch now shows a contained error in just the sections that need it, per section 7's explicit requirement. Previously all four services were bundled through one `getStudentIntelligence()` call that failed as a unit.
- Responsive two-column desktop / single-column mobile structure
- Dedicated dashboard visual layer
- Reduced-motion handling
- Deliberate primary-action emphasis
- List interaction motion kept subtle
- Entrance motion + animated metrics (2026-08-13)
- Real accent-color rendering (2026-08-13 -- CSS token bug fix, see DEVLOG)

### Deliberately deferred

- Historical terminology migration until the original blueprint naming decision is recovered
- Destructive removal of existing data domains
- New learning algorithms
- New dashboard metrics without evidence they help decisions

## QA gate

Before merge, run a production-equivalent build/type check and browser verification of `/dashboard`, including authenticated rendering, loading state, Cortex timeout/error state, desktop layout, and mobile layout.

2026-08-15: `tsc --noEmit`, full vitest suite, and a genuine `next build` (temporary font-fetch workaround for the build sandbox only, not committed) all verified against the independent-fetch-boundary change before merge.
