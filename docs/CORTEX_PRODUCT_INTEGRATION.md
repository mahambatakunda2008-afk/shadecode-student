# Cortex Product Integration

The adaptive Cortex modules now expose a pure integration boundary for product code.

`buildCortexTopicContext()` combines:

1. a topic identifier
2. candidate learning actions
3. replayable learning events
4. optional calibrated weights

and returns the current learning state plus the complete ranked decision surface.

## Boundary rule

This layer deliberately has no persistence, network, Supabase, provider, or UI dependencies. Product code can consume the result and decide how/where to persist an intervention.

## Current flow

```text
Product learning event history
        ↓
Learning State
        ↓
Candidate actions
        ↓
Counterfactual ranking
        ↓
chosen + alternatives + margin
```

## Production rollout rule

The integration boundary should initially run in shadow mode beside the existing recommendation path. Do not replace production recommendations until benchmark, holdout, and real outcome evaluation establish that the new path is safe and useful.
