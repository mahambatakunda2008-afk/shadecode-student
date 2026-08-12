# Cortex Benchmark v1

`CORTEX_BENCHMARK_VERSION = v1.0.0`

This corpus is a regression and calibration benchmark for the Cortex/SLU decision layer.

## Coverage

The first version contains reviewed scenarios for:

- exam pressure
- weak topics
- forgetting risk
- rapid improvement
- prerequisite bottlenecks
- sparse history
- conflicting goals
- short-session constraints
- exploration
- misleading confidence
- multi-subject competition

Each case has:

- stable ID
- candidate actions
- preferred candidate
- category
- human-readable rationale

## Important distinction

A preferred candidate is a **benchmark label**, not a scientific truth. These labels encode product/design expectations that we want the algorithm to satisfy and later challenge with real evidence.

Passing this benchmark does not establish educational efficacy.

## Versioning rule

Changes to scenarios, labels, or rationales should increment the benchmark version. Do not silently rewrite a case after seeing algorithm results.

## Calibration usage

The benchmark can be split into training and holdout sets by a deterministic, versioned procedure. Calibration should only use the training portion. Holdout performance is the gate for deciding whether a calibrated configuration is worth further investigation.

## Future additions

- explicit intervention outcomes
- delayed retention outcomes
- human review disagreement metadata
- counterfactual candidate sets
- anonymized real-world trajectories
- adversarial cases designed to expose reward hacking
