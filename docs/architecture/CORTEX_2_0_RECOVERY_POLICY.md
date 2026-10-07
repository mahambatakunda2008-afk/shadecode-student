# Cortex 2.0 Recovery Policy

Cortex recovery is **failure-aware**, not retry-first.

## Policy

| Failure | Preferred recovery |
|---|---|
| timeout | verified data → warm local → checkpoint → stop |
| provider unavailable | verified data → warm local → checkpoint → stop |
| rate limited | verified data → warm local → checkpoint → stop |
| empty response | verified data → warm local → stop |
| invalid response | one bounded repair → verified data → stop |
| grounding unavailable | verified data → otherwise stop |
| aborted | resume checkpoint → otherwise stop |
| execution exception | one bounded repair only when explicitly supported → stop |
| unknown | stop |

## Critical rule

A Cortex operation must not automatically restart the entire student task merely because its model lane failed.

Recovery should change the **lane or operation**, not repeat the same failed operation indefinitely.

Examples:

- A timed-out lesson generation should switch to verified curriculum material or a warm local model.
- A malformed lesson section should use the section repair path, not regenerate the entire lesson.
- An interrupted durable job should resume from its checkpoint.
- Missing curriculum grounding must never be recovered by inventing syllabus facts.

## Separation of responsibility

src/lib/cortex/runtime/recovery.ts chooses the safe recovery policy.

Feature-specific systems execute that policy because they know their own checkpoints, verified local data, repair operations, local model availability, and persistence requirements.

This prevents the generic execution boundary from accidentally overriding specialized reliability machinery such as the lesson generation job system.
