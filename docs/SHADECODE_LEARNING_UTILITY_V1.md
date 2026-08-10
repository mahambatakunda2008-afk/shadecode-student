# Shadecode Learning Utility v1

**Status:** Prototype / foundational algorithm
**Date:** 2026-08-10

## Why this exists

Shadecode already contains several recommendation systems and a unified Recommendation Engine. The audit found duplicated weak-area, lesson, subject, time, and priority logic across the codebase. The existing engine is useful infrastructure, but its scoring is still primarily a collection of fixed additive rules.

The next layer is a Shadecode-owned decision function that answers a more valuable question:

> **What is the highest-value learning move for this student right now?**

This should eventually power the dashboard's Next Best Move, Cortex planning, revision scheduling, exam preparation, and offline decision-making.

## Core idea

Shadecode Learning Utility (SLU) evaluates every candidate learning move using three concepts:

```text
NEED × OPPORTUNITY ÷ COST
```

### Need

How strongly does the student need this intervention now?

- mastery gap
- retention risk
- exam urgency
- declining/unstable performance trend
- prerequisite value

### Opportunity

How much useful learning signal is available?

- goal alignment
- curriculum gap
- uncertainty about the student's state
- recent learning momentum

### Cost

How expensive is the intervention in study time?

A sub-linear penalty prevents very long tasks from dominating simply because they contain more material. Short, high-value interventions can therefore win when appropriate.

## Exploration

SLU includes a small bounded uncertainty bonus. This prevents the system from repeatedly selecting only topics it already knows are weak. Uncertainty can earn a candidate a little extra attention, but it can never overwhelm a genuine urgent need.

This creates the beginning of an exploration/exploitation loop without requiring a neural model or cloud inference.

## Why this can become proprietary Shadecode infrastructure

The formula itself is not the moat. The moat comes from the learning state accumulated around it:

1. Shadecode observes what the student attempted.
2. It estimates the student's current state.
3. SLU chooses the next action.
4. The student acts.
5. Shadecode measures the outcome.
6. The state estimate changes.
7. The next decision is recalculated.

Over time, the weights and state transitions can be learned from Shadecode's own outcome data rather than copied from a generic AI prompt.

## Planned evolution

### V1: deterministic utility

Current implementation. Pure TypeScript, no model call, no database dependency, deterministic and testable.

### V2: stateful learning trajectory

Add a per-topic state vector containing:

- mastery
- retention
- confidence
- stability
- response latency
- error patterns
- recent exposure
- prerequisite dependencies
- intervention history

### V3: outcome-calibrated weights

Use real Shadecode outcomes to learn which signals actually predict useful interventions. Keep the final decision layer interpretable and bounded.

### V4: offline-first intelligence

Run the decision engine locally. Cloud AI becomes an optional teacher/generator, not a requirement for the core adaptive loop.

### V5: counterfactual learning decisions

Instead of asking only "what should the student do?", estimate the expected value of several possible actions and select the action with the best expected learning utility per minute.

## Important constraint

SLU v1 is a product algorithm, not a scientifically validated cognitive model. It must not produce fabricated retention percentages, predicted grades, or claims of educational efficacy. Real calibration requires real outcome data and evaluation.

## Integration plan

1. Keep SLU isolated and pure.
2. Add candidate generation from the existing Recommendation Engine.
3. Use SLU to rank those candidates.
4. Add outcome logging for selected actions.
5. Compare SLU decisions with the current rule-based engine.
6. Only then replace existing priority logic where evaluation shows an improvement.

This preserves the working product while giving Shadecode a path toward genuinely owned learning intelligence.
