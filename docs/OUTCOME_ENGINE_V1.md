# Cortex Outcome Engine v1

The Outcome Engine closes the first experimental loop around a Cortex decision.

```text
Decision
  ↓
Intervention started
  ↓
Intervention completed/abandoned
  ↓
Follow-up performance
  ↓
Outcome evaluation
```

## Signals

- uptake/state of intervention
- completion
- time efficiency
- follow-up performance relative to a baseline

## Important interpretation rule

An outcome score is an evaluation signal, not proof that an intervention caused an improvement. A single student's result can be affected by many variables.

The system should therefore aggregate observations over time and compare against appropriate baselines or control strategies before changing algorithm weights.

## What this enables

Shadow Cortex can eventually answer:

- Which decision types get acted upon?
- Which decisions get completed?
- Which interventions produce useful improvement per minute?
- Where does SLU disagree with the legacy engine?
- Are disagreements systematically better or worse?

## Deliberate limitation

V1 is a pure evaluation module. It does not persist data, update weights, or claim causal effects.

## Next step

Add a durable, privacy-minimized intervention event record and aggregate evaluation functions. Then run Shadow Cortex for a meaningful evaluation window before considering self-calibration.
