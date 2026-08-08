# Shadecode Student Dashboard Redesign Specification

**Status:** Ready for implementation planning  
**Owner:** ChatGPT, product/UX lead  
**Implementation partner:** Claude  
**Scope:** Student dashboard experience only; underlying services may be changed when required to support the experience.

## 1. Source basis

This specification is grounded in the current dashboard implementation and the existing platform audit. The current dashboard is composed of `NextActionDashboard` plus `CortexIntelligencePanel`, with data loaded client-side through Supabase authentication and `getStudentIntelligence()`. fileciteturn68file0

The master platform audit identified dashboard-related issues including the absence of a personalized welcome-back experience, weak prominence/actionability for Cortex recommendations, inconsistent navigation, and broader design-system, loading-state, mobile, accessibility, and performance problems. fileciteturn71file0

The current implementation already has useful ingredients: a primary next action, streak/progress/score/weak-area statistics, recommended lesson, weak topic, Cortex insight, study-plan recommendations, upcoming assessments, and a Cortex status panel. fileciteturn69file0

This document therefore defines a **recomposition**, not a blind rewrite and not a generic AI-dashboard template.

## 2. Product objective

The dashboard should answer one question immediately:

> **What should I do now, and why does it matter?**

A returning student should understand their current state within seconds and reach the highest-value action without hunting through cards.

The dashboard should feel like a learning command center, not an analytics wall.

## 3. Primary hierarchy

Order information by action value:

1. **Welcome-back context** — recognize the student and their recent state.
2. **Next best action** — one dominant action selected from trustworthy intelligence.
3. **Why this action** — concise evidence such as weak topic, upcoming exam, unfinished lesson, or streak context.
4. **Momentum** — streak, progress, recent performance, and meaningful change.
5. **Today's plan** — a short, actionable sequence rather than a dense list.
6. **Upcoming deadlines/exams** — only items requiring awareness soon.
7. **Cortex insight** — actionable and explainable, with a clear reason and CTA.
8. **Deeper analytics** — secondary navigation, not dashboard clutter.

## 4. Proposed experience

### A. Welcome-back header

Show a concise contextual greeting and recent-state signal.

Examples of states:

- returning after studying recently
- returning after a gap
- exam approaching
- plan completed / caught up
- new user without enough history

Do not fabricate personalization. If the data is unavailable, use a neutral state.

### B. Next Action hero

Keep the existing strong concept of a dominant next action, but make it the clear focal point.

It must contain:

- action title
- concise reason
- priority/urgency when real
- one primary CTA
- optional secondary "Why this?" explanation
- trustworthy source label where useful, e.g. Cortex

The hero must never display fabricated readiness, predicted grades, or hardcoded personalized metrics.

### C. Momentum strip

Replace the current collection of equally weighted statistic cards with a compact momentum summary.

Candidate metrics:

- current streak
- overall curriculum progress
- recent average score
- weak-area count

Only show metrics with real data. Where a metric is unavailable, omit or replace it with a useful verified signal.

### D. Today's study plan

Present 2–4 high-value actions in priority order.

Each row should answer:

- what
- subject/topic
- estimated effort when known
- why it is recommended
- completion state

Avoid displaying a large generic recommendation feed.

### E. Focus area

Give the student one clear weak-area or growth-area card based on real mastery/performance data.

CTA should lead directly to the relevant learning/revision experience when the route exists.

### F. Upcoming assessments

Show only meaningful upcoming exams/assessments. The current implementation correctly uses `exams.exam_date` rather than the nonexistent `tasks.due_date`; preserve that correction. fileciteturn69file0

Use relative urgency where safely derivable, but do not invent deadlines.

### G. Cortex insight

Cortex should appear as an actionable learning assistant, not decoration.

Each displayed insight should ideally provide:

- insight
- evidence/context
- confidence or source context when available
- action

Do not imply certainty beyond the underlying data.

## 5. Information architecture

Desktop:

```text
Header / Welcome-back context
          ↓
     Next Best Action
          ↓
      Momentum strip
          ↓
   ┌───────────────┐
   │ Today's Plan  │ Focus Area
   └───────────────┘
          ↓
 Upcoming Assessments + Cortex Insight
          ↓
      deeper analytics
```

Mobile:

```text
Welcome
  ↓
Next Action
  ↓
Momentum
  ↓
Today's Plan
  ↓
Focus Area
  ↓
Upcoming Assessments
  ↓
Cortex Insight
```

Do not preserve desktop columns simply by shrinking them. Mobile is a deliberate priority order.

## 6. State design

Every major dashboard section must have intentional states:

- loading
- populated
- empty
- partial data
- recoverable error
- unavailable data

No section may remain in an indefinite loading state.

Where a request can hang, the UI must eventually surface an actionable failure or retry path. This complements the broader agent-work rule that async operations require bounded terminal states.

## 7. Reliability requirements

Dashboard loading must not depend on one slow intelligence request preventing the entire dashboard from becoming usable.

Prefer independent/parallel loading boundaries for secondary sections where architecture permits.

Required behavior:

- primary shell renders quickly
- independent sections can resolve independently
- timeout/error in one secondary section does not blank the entire dashboard
- retry is available for recoverable failures
- authentication failure routes cleanly to login
- no swallowed request errors
- no permanent spinner

Any underlying API/provider call that can block the dashboard must have bounded timeout behavior appropriate to its role.

## 8. Accessibility requirements

The dashboard redesign must address the audit's accessibility concerns:

- semantic landmarks and headings
- keyboard-accessible controls
- visible focus states
- appropriate accessible names
- sufficient contrast
- buttons/links with clear purposes
- non-color-only status communication
- touch targets appropriate for mobile
- reduced-motion compatibility where animation is introduced

## 9. Performance requirements

The dashboard should not become a single giant client-side dependency graph.

Before implementation, identify which data can be fetched server-side or cached safely and which genuinely requires client interactivity.

Avoid loading heavy secondary features before the primary dashboard experience is usable.

## 10. Design constraints

- Reuse the existing Shadecode design tokens/components where they are sound.
- Do not introduce a new visual language merely to make the dashboard look different.
- Do not use decorative AI imagery as a substitute for information hierarchy.
- Avoid excessive cards, badges, gradients, animated counters, and competing accent colors.
- Maintain a calm, student-focused visual hierarchy.
- Preserve the existing successful "next action" concept.

## 11. Data integrity

Dashboard personalization must be based on actual stored or computed data.

Never display:

- hardcoded predicted grades
- fabricated exam readiness
- placeholder deadlines presented as real
- fake streaks/progress
- invented Cortex confidence

If data is insufficient, explicitly design a useful empty/early-user state.

## 12. Implementation sequence

1. Audit current dashboard data dependencies and identify blocking requests.
2. Map each existing dashboard section to its source of truth.
3. Identify components worth retaining.
4. Establish loading/error/empty boundaries.
5. Implement the new information hierarchy.
6. Add welcome-back/context logic using verified data.
7. Consolidate repeated visual patterns through existing design-system primitives where appropriate.
8. Verify mobile and keyboard behavior.
9. Verify performance and failure behavior.
10. Run user-flow and visual QA.

## 13. Acceptance criteria

The redesign is not complete until:

- a returning student can identify the next recommended action immediately
- the primary CTA is visually and semantically dominant
- no fabricated personalized metric is displayed
- major sections have usable loading/empty/error states
- one failed secondary request does not blank the entire dashboard
- mobile layout has a deliberate information order
- keyboard navigation works across all dashboard controls
- focus states are visible
- dashboard data sources are documented
- no duplicate scheduling/intelligence architecture is introduced
- existing working functionality is preserved unless intentionally replaced
- tests/build/CI pass

## 14. Non-goals

This work does not automatically include:

- rebuilding Cortex
- rebuilding the Scheduling Engine
- creating a new analytics platform
- redesigning every page in Shadecode Student
- inventing future blueprint features
- adding AI features merely for visual novelty

Cross-cutting changes are allowed only when necessary to satisfy the dashboard experience or reliability requirements.

## 15. Handoff to Claude

Claude should treat this document as the product/UX implementation contract for the dashboard track. Before changing code, inspect the current implementation and its data sources, then propose or implement a focused plan. If implementation findings contradict this document or expose a product decision, stop at the decision boundary and document the conflict rather than silently redefining the product.
