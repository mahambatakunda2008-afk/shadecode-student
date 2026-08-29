# Shadecode Student

**A personal learning system that continuously learns how you learn.**

Shadecode Student is an AI-assisted learning platform built around one idea: studying should not be a collection of disconnected tools. Lessons, questions, mistakes, exams, projects, revision and progress should become useful evidence that helps decide what the learner should do next.

Built with a strong focus on Cambridge and ZIMSEC learners, and expanding across secondary school, university and polytechnic study, Shadecode Student combines learning, assessment, project work, planning, gamification, analytics and **Cortex**, its learning-intelligence layer.

> **Observe → Understand → Predict → Act → Evaluate → Learn**

## Current product surface

- **Cortex** — learning-intelligence foundations, insights, weak-area signals and recommendations
- **Learn** — AI-assisted, curriculum-aware learning workflows
- **Exam Simulation** — timed assessment and performance workflows
- **Exam Hub** — past-paper and question-bank workflows
- **Math Checker** — handwritten mathematics feedback
- **Project Studio** — staged project planning, evidence capture, integrity checks, recovery and learner-owned document assembly
- **Study organisation** — tasks, timetables, focus sessions and analytics
- **Gamification** — XP, levels, achievements, streaks, daily challenges and leaderboards
- **Careers explorer**
- **PWA / local-first foundations** — useful state is being moved toward durable local storage and reliable synchronization

Feature maturity varies. The project distinguishes shipped foundations from strategic roadmap items instead of presenting prototypes as finished intelligence.

## Architecture direction

The core architecture is intentionally model-independent:

`student action → learning event → canonical normalization → idempotency → Student Intelligence → intervention → measured outcome`

The canonical learning-event foundation preserves source event IDs, scopes identity to the learner, explicitly skips unsupported mappings and provides deterministic replay tests. See `docs/architecture/canonical-learning-events.md`.

Cortex should reuse the existing mastery, weak-area, retention and recommendation semantics. A foundation model can explain, tutor or generate content, but it must not become the deterministic source of truth for learning state.

## Product roadmap

### Now

1. Harden canonical learning-event ingestion and connect major product actions.
2. Continue migrating high-value entities onto the local-first operation path.
3. Finish shared Canvas/tooling verification and browser smoke coverage.
4. Expand assessment intelligence and curriculum coverage.
5. Keep Project Studio, Learn, Exam Simulation and Cortex surfaces coherent as one product.

### Next

- deep, coverage-driven lessons;
- subject-aware structured diagrams;
- shared Question Forge across learning and assessment;
- Shadecode Library with provenance for authorized sources;
- Concept Atlas and Mistake Museum;
- Paper Intelligence and stronger revision loops;
- Learning Replay and measurable intervention outcomes.

### Later research

- privacy-conscious learner-state modelling;
- adaptive intervention selection;
- small specialized local models;
- quantization and knowledge distillation;
- retrieval/caching and intelligent model routing;
- distributed/peer infrastructure only after single-device offline reliability and authenticated sync are mature.

## Evidence and safety principles

- Never fabricate mastery, scores, interviews, measurements, observations or project evidence.
- Preserve source provenance wherever generated content depends on external material.
- Keep deterministic calculations and learning-state rules separate from generative AI.
- Server-side authorization and RLS remain authoritative.
- Do not introduce peer-to-peer student data sharing or foundation-model training as hidden dependencies.
- Prefer reversible, observable changes over silent mutations.

## Offline and intelligence strategy

Shadecode is being engineered for real student conditions, including unreliable connectivity. The goal is not merely to cache the shell. Saved lessons, questions, diagrams, notes and learning state should progressively become usable offline, with deterministic synchronization when connectivity returns.

For AI, the project investigates **useful intelligence at low latency, low cost and small device footprint**. Compression is an engineering tool, not the product goal. Quantization, distillation, specialization, retrieval, caching and routing are evaluated according to actual learning utility.

## Positioning

Shadecode Student is not trying to win by being another general-purpose chatbot. Its potential moat is:

**deep curriculum + persistent learner state + adaptive intervention + offline/edge intelligence + measurable learning outcomes.**

The long-term question is:

> **Does the system measurably improve what the learner does next?**

## Business direction

The product should prove value and retention before aggressive monetization. Possible future models include a meaningful free tier, optional Student Plus capabilities, school plans and education infrastructure/API products. Pricing remains experimental rather than a committed promise.

## Tech stack

- **Framework:** Next.js App Router + TypeScript
- **Database/Auth:** Supabase Postgres, RLS and Auth
- **AI:** routed provider chain with local/cloud research evolving independently of deterministic learning state
- **Deployment:** Vercel
- **PWA:** `@ducanh2912/next-pwa`
- **Testing:** Vitest
- **CI:** GitHub Actions
- **Monitoring:** Sentry

## Getting started

```bash
npm install
npm run dev
```

Never commit secrets. Environment requirements belong in deployment configuration.

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
| `npm test` | Run Vitest |
| `npm run lint` | Run ESLint |
| `npm run test:curriculum` | Run curriculum data tests |

## Documentation map

- `docs/architecture/canonical-learning-events.md` — canonical learning-event contract
- `docs/PROJECT_STATUS_2026-08-29.md` — current product truth and release posture
- `docs/architecture/project-studio-finish-line.md` — Project Studio completion boundary
- `docs/LEARNING_EXPERIENCE_V2.md` — Learning Experience direction
- `docs/CANVAS_AND_TOOLING_V2.md` — shared Canvas and tooling direction
- `docs/ARCHITECTURE.md` — system architecture
- `docs/AUDIT_2026-08.md` — reliability/schema audit history
- `.cortex/tasks.md` — executable engineering roadmap

## Engineering discipline

Before opening a PR:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

CI and production deployment checks remain part of the release gate. Automation can accelerate implementation, but it does not replace review or verification.
