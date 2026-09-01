# Shadecode Student Hackathon Strategy

## Core strategy

Shadecode Student remains the product. Hackathon submissions are thin, purpose-built experiences around the reusable Cortex intelligence and local/offline-first foundations. Do not fork the product into unrelated projects.

## Current competition pipeline

| Priority | Competition | Deadline | Prize | Submission angle |
|---|---|---|---:|---|
| P0 | WebMCP Challenge | 2026-09-03 | $35,000 | Agent-native study workflow using structured web tools |
| P1 | VoltHacks | 2026-09-05 | $35,785 | Reuse Cortex agent infrastructure |
| P1 | Agentic Cinema | 2026-09-09 | $75,000 | Cinematic demonstration of an autonomous learning agent |
| P1 | Agents for Humans | 2026-09-14 | $40,000 | New Cortex-derived agent experience |
| P2 | CALL-E | 2026-09-14 | $10,000 | Voice/agent adaptation if eligibility and requirements fit |
| P2 | AI Builders | 2026-09-15 | $33,900 | General AI/Cortex build |
| P2 | GatewayGS | 2026-09-16 | non-cash | Student-focused low-field submission |
| P2 | Global Innovation Build Challenge V2 | 2026-09-21 | $149,525 | Flagship AI innovation submission |
| P3 | Prometheus September | 2026-09-27 | $1,500 | Low-field student opportunity |

## Architecture

```text
Cortex Core
  ├── memory
  ├── reasoning
  ├── planning
  ├── routing
  ├── scoring
  └── local/offline state
          │
          ├── WebMCP tools
          ├── Agentic demo
          ├── Human-facing agent
          └── other competition adapters
          │
          └── Shadecode Student
                ├── Learn
                ├── Exam Hub
                ├── Past Papers
                ├── Tutor
                └── Mastery
```

## WebMCP demo journey

Student request: "I have Physics tomorrow and three hours tonight. Make me a plan and help me execute it."

Cortex workflow:

1. Inspect student context.
2. Inspect curriculum.
3. Identify weak areas.
4. Find relevant local/past-paper material.
5. Create a time-boxed plan.
6. Start a study session.
7. Teach and test.
8. Evaluate performance.
9. Adapt the next action.
10. Persist progress locally when possible.

## Submission principles

- Demonstrate a real working path, not a mock chatbot.
- Keep the offline/local-first architecture visible where it strengthens the story.
- Disclose pre-existing product work and clearly identify new competition-specific work.
- Never claim eligibility, prizes, deadlines, or platform support without checking current rules.
- Never add paid infrastructure as a requirement when a free/local alternative is practical.
- Do not expose secrets, API keys, private user data, or internal credentials in demos or repositories.

## Reuse policy

A competition adapter may reuse stable Shadecode/Cortex infrastructure, but each submission must satisfy that competition's rules about originality, build period, APIs, sponsors, licensing, and disclosure.
