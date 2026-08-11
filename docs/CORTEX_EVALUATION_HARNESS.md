# Cortex Evaluation Harness

The evaluation harness provides a deterministic environment for replaying learning histories and comparing decision behavior.

## Principle

Do not improve an adaptive algorithm by intuition alone. Give multiple algorithm versions the same evidence and compare their decisions and downstream signals.

## Scenario

Each scenario contains:

- an identifier
- a topic
- candidate learning actions
- a chronological learning-event history

The harness produces:

- selected decision
- final mastery estimate
- final uncertainty estimate

## Current limitation

V1 evaluates decision/state mechanics. It does not claim causal learning improvement because the synthetic/replayed scenario has no independent counterfactual outcome.

## Future benchmark structure

```text
scenario
  ├── student state/history
  ├── candidate actions
  ├── algorithm A
  ├── algorithm B
  └── observed outcome
          ↓
       metrics
```

Potential metrics:

- decision agreement
- decision utility
- completion rate
- improvement per minute
- delayed retention
- calibration error
- unnecessary intervention rate

## Golden scenarios

Before self-calibration, maintain a small set of human-reviewed scenarios covering:

1. severe weak area + imminent exam
2. weak area + no exam pressure
3. strong topic + high uncertainty
4. improving topic that should not be over-intervened on
5. many competing subjects
6. prerequisite bottleneck
7. sparse student history

These are regression tests for the algorithm's behavior, not proof of educational efficacy.

## Long-term objective

Once real, privacy-minimized outcome data exists, the same harness can replay anonymized trajectories against candidate algorithm versions. Promotion decisions should be based on predefined evaluation criteria rather than whichever version produces the most appealing examples.
