# Counterfactual Cortex v1

Counterfactual Cortex preserves the ranked alternatives produced by the learning utility instead of storing only the winner.

## Output

For every candidate set it records:

- chosen decision
- every alternative
- rank
- score
- decision margin between first and second choice

## Why this matters

A winner alone hides uncertainty. A 91 vs 40 decision is different from a 51 vs 50 decision even if both produce the same winner.

The margin gives Shadow Cortex an explicit signal for how decisive the current ranking is.

## What this is not

The score is not a probability of success. The alternative ranking is not a causal counterfactual outcome. We need observed intervention outcomes before estimating whether one alternative would actually outperform another.

## Future path

1. preserve alternatives at decision time
2. observe the selected intervention outcome
3. accumulate outcome evidence by context
4. estimate alternative value conservatively
5. use exploration only when uncertainty and safety allow it

No autonomous exploration or production weight updates are enabled by this module.
