# Cortex Agent Hackathon Build

## The demo

Shadecode Student's Cortex is being prepared as a persistent learning agent rather than a generic tutoring chatbot.

The core loop is:

`learner action → canonical learning event → durable evidence → mastery projection → Cortex decision → targeted intervention → new observation`

The important distinction is that generated language is not the source of truth for learning state. The decision engine reads the durable `topic_mastery` projection and selects one highest-value intervention.

## Current implementation

- `POST /api/intelligence/events` accepts authenticated canonical learning events and projects observable topic evidence into `topic_mastery`.
- `src/lib/cortex/nextAction.ts` ranks learning needs and chooses an intervention from observable evidence.
- `GET /api/cortex/next-action` exposes the authenticated decision with evidence and a success check.
- `/cortex-agent` provides the human-facing demo surface.
- `src/lib/cortex/nextAction.test.ts` covers prerequisite repair, retrieval, and empty-state behavior.

## Demo script

1. Start with a learner who has recent question/exam observations.
2. Open `/cortex-agent`.
3. Show the selected topic and the evidence used to select it.
4. Show that Cortex chooses a specific intervention, not a generic "study more" message.
5. Complete the intervention through an existing Learn/Exam flow.
6. Emit the resulting canonical learning event.
7. Return to `/cortex-agent` and re-evaluate.
8. Show the changed evidence and a changed next action.

## Evidence rules

- Never fabricate mastery, scores, interviews, measurements, or observations.
- Deterministic learning-state calculations remain authoritative.
- AI may explain, tutor, generate practice, or summarize evidence, but must not silently become the source of truth for mastery.
- Server authentication and database RLS remain authoritative.

## Hackathon positioning

**Problem:** students have plenty of content but little continuity between what they did, what they actually learned, and what they should do next.

**Solution:** Cortex turns learning activity into durable evidence and uses that state to choose the next intervention.

**Differentiation:** persistent learner state, curriculum-aware evidence, measurable intervention loops, and an offline/local-first product direction instead of a stateless chat wrapper.
