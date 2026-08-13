# Cortex Calibration Engine v1

The calibration engine adjusts the existing SLU weight configuration against a reviewed set of examples.

## Method

V1 uses a bounded deterministic coordinate search:

1. evaluate the current weights
2. perturb one weight by a small amount
3. keep the change only if the reviewed-example score improves
4. repeat for each supported signal

Weights remain in `[0, 2]` as multipliers around the SLU v1 baseline. A multiplier of `1` preserves baseline influence.

## Why this is deliberately simple

The first calibration system should be easy to inspect and reproduce. A sophisticated optimizer can hide mistakes and overfit a tiny dataset.

## Training/evaluation separation

Calibration examples are **reviewed examples**, not arbitrary user telemetry. This is intentional. We should first establish that the objective itself is sensible before allowing real-world data to tune production behavior.

The benchmark now supports a deterministic held-out split: calibration runs on the training partition, then the baseline and calibrated weights are scored on unseen examples. A calibrated score is not considered an improvement merely because it wins on the examples used to tune it.

## Guardrails

- No automatic production deployment.
- No weight update from a single event.
- No unreviewed labels treated as ground truth.
- No causal claims from prediction accuracy alone.
- Bounds prevent runaway weights.
- Every calibration run should record its input weights, examples/version, output weights and score.
- Holdout evaluation is required before claiming generalization.

## Next step

Build a versioned benchmark set with human-reviewed scenarios and explicit outcome labels. Compare calibrated weights against the baseline on the held-out set. Only if the improvement survives the holdout should calibration become part of a controlled offline experimentation workflow.
