# Dashboard Visual Evolution

**Status:** Active implementation direction
**Date:** 2026-08-10

## Why the previous dashboard was rejected

The first Dashboard Reimagined pass was structurally cleaner but visually too close to a generic monochrome SaaS dashboard. It over-relied on neutral cards and did not make enough use of Shadecode's visual identity or the student's real learning state.

The dashboard must feel like a learning product, not an admin console.

## Product job

The dashboard answers, in order:

1. What should I do next?
2. Why is Shadecode recommending it?
3. How am I progressing?
4. Which subjects are moving or stalled?
5. What needs attention before an assessment?
6. What did I work on recently?

The core loop remains:

**understand → practice → assess → learn from mistakes → adjust → repeat**

The dashboard is the launchpad into that loop, not a feature directory.

## Visual direction

The new direction is **premium, expressive, calm, intelligent, and alive**.

It deliberately uses:

- subject-aware accent colors;
- restrained gradients and ambient light;
- stronger typographic hierarchy;
- compact data visualisation instead of card piles;
- progress rings and signal bars where they communicate real data;
- glass/translucent surfaces only where they improve hierarchy;
- motion for feedback, not decoration;
- strong dark-mode contrast while preserving a real visual identity.

It deliberately avoids:

- monochrome card grids;
- every metric becoming a separate oversized tile;
- decorative AI gradients without meaning;
- fake scores or invented predictions;
- a permanent Cortex sidebar consuming layout space;
- dashboard sections that exist only because a feature exists.

## Current composition

```text
Header / context
        ↓
Next Best Move
        ↓
Momentum strip
        ↓
Subjects in Motion
        ↓
Today
        ↓
Recently Touched

Side rail:
Focus Area
Next Up
Cortex Signal
```

The hierarchy can change as user research and real usage data teach us more. This is an experience contract, not a permanent UI prison.

## Real-data rule

Dashboard UI must consume real Student Intelligence data whenever the data exists:

- overall completion;
- current streak;
- recent average performance;
- recommendation queue;
- weak areas;
- subject progress;
- recent lessons;
- activity rhythm;
- upcoming assessments;
- Cortex insights.

If data is unavailable, the UI must explain that honestly. It must not manufacture numbers to make the screen look complete.

## Recommendation → Learn contract

A recommendation is not merely a navigation link.

When a recommendation identifies a subject and topic, selecting it must open Learn with both values prefilled.

Expected URL contract:

`/learn?subject=<subject>&topic=<topic>`

The Learn page must consume both query parameters and populate its subject and topic controls before the student begins generation.

This is a cross-feature contract and should be regression-tested.

## Next implementation gate

The visual rebuild is not considered complete until:

- real user data is visibly driving the page;
- subject accents remain accessible in light and dark themes;
- the recommendation flow pre-fills Learn;
- empty/loading/error states feel intentional;
- mobile composition remains coherent;
- the rendered dashboard is visually reviewed rather than judged from source alone;
- CI/build checks pass.
