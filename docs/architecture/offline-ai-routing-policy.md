# Offline-first AI routing policy

Cortex must preserve useful behavior when connectivity disappears.

## Routing order

1. Local deterministic engine
2. Installed compatible local model
3. Cloud model only when explicitly allowed and connectivity exists
4. Graceful capability-specific fallback

A failed cloud request must never erase local work or leave the learner without the underlying non-AI feature.

## Capability degradation

- Tutor: local model or concise deterministic/content-grounded fallback.
- Project Coach: local project workflow, evidence checklist and integrity guard remain available even without an LLM.
- Study Planner: local scheduling engine remains fully functional.
- Question Generator: local question bank/template engine remains functional.
- Summarizer: local extraction/condensation fallback may be used where supported.

## Privacy

Local-first means learner data should remain local by default. Cloud enhancement should be explicit in the runtime policy and must not silently upload private project evidence merely because an offline model is unavailable.
