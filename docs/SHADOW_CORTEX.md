# Shadow Cortex

## Purpose

Shadow Cortex lets Shadecode run its new Learning Utility beside the existing Recommendation Engine without changing the student's production recommendation.

The purpose is measurement, not immediate replacement.

## Decision comparison

```text
Existing Recommendation Engine ──┐
                                 ├── compare ──> telemetry/evaluation
Shadecode Learning Utility ──────┘

                         ↓
                    student action
                         ↓
                       outcome
```

## What to measure

For each decision, eventually record:

- legacy recommendation category
- SLU recommendation category
- agreement/disagreement
- SLU utility score
- candidate factors
- intervention duration
- whether the student started the recommendation
- whether it was completed
- immediate performance outcome
- later retention/performance outcome

Do not store unnecessary personal content merely to evaluate the algorithm.

## Evaluation metrics

### 1. Decision agreement

How often does SLU choose the same broad action category as the existing engine?

Agreement is descriptive, not proof that either system is correct.

### 2. Action uptake

How often does the student actually start the recommended intervention?

### 3. Completion efficiency

Useful completed learning outcome per minute spent.

### 4. Learning outcome

Change in subsequent practice/exam performance on the relevant topic.

### 5. Retention outcome

Performance when the topic is tested again after a meaningful delay.

### 6. Calibration

Whether high-utility decisions actually produce better outcomes than low-utility decisions.

## Guardrails

- Shadow mode must not change production recommendations.
- No automatic weight updates from a single student's outcome.
- Do not treat model-generated confidence as ground truth.
- Keep algorithm inputs bounded and explainable.
- Preserve enough provenance to reproduce why a decision was made.

## Promotion rule

SLU should only become the production decision layer after evaluation shows a meaningful improvement over the existing system on predefined metrics. The threshold should be agreed before looking at results to avoid moving the goalposts.

## Long-term direction

Shadow Cortex is the bridge from a hand-designed algorithm to an evidence-calibrated learning system. Once enough outcome data exists, candidate weighting can be calibrated from actual Shadecode behavior while keeping the final decision process bounded and inspectable.
