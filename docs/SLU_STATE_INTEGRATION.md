# SLU + Learning State Integration

The Learning State is now the source of adaptive signals for the Shadecode Learning Utility.

## Mapping

| Learning State | SLU signal |
|---|---|
| mastery | mastery |
| retention | retention risk = 100 - retention |
| recent improvement | trend risk / momentum |
| uncertainty | uncertainty |
| prerequisite health | prerequisite value |
| curriculum context | curriculum gap |
| exam context | exam urgency |
| student goals | goal alignment |

This is an explicit adapter rather than hidden arithmetic inside the scoring engine. That keeps the decision model inspectable and makes future calibration possible.

## Important limitation

The mapping is currently heuristic. In particular, retention is not a validated forgetting curve, and recent improvement is not a validated trend estimator. These are internal signals that need evaluation.

## Next step

Feed real candidate contexts from Cortex into this adapter, then compare the resulting SLU decision with the existing recommendation system under Shadow Cortex. Do not automatically promote the new decision path to production.
