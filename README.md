# Shadecode Student

**A personal learning system that continuously learns how you learn.**

Shadecode Student is an AI-powered learning platform built around a simple idea: studying should not be a collection of disconnected tools. Your lessons, questions, mistakes, exams, revision sessions, and progress should gradually become a learning model that helps decide what you should do next.

Built with a strong focus on Cambridge and ZIMSEC learners, Shadecode Student combines adaptive learning, exam practice, past-paper workflows, handwritten-work feedback, study planning, gamification, analytics, and **Cortex**, its evolving learning-intelligence layer.

> **Observe → Understand → Predict → Act → Evaluate → Learn**
>
> That is the long-term Cortex loop.

## What Shadecode Student is becoming

Shadecode Student is moving beyond the idea of an "AI tutor" toward a **learning intelligence system**.

Instead of only answering a question, the system should increasingly be able to understand:

- what a learner knows;
- what they are struggling with;
- recurring mistakes and misconceptions;
- what they are likely to forget;
- how they tend to study;
- which interventions have helped before; and
- what the learner should do next.

The long-term goal is a durable **Learning State Engine**, followed by increasingly adaptive interventions, while keeping the architecture practical and evidence-driven.

## Current capabilities

- **Cortex learning intelligence** — insights, weak-area signals, recommendations, and the foundation for persistent learning state
- **AI Learn** — AI-assisted lessons and tutoring
- **Exam Simulation** — timed practice exams with automated marking and performance tracking
- **Exam Hub** — searchable past-paper/question-bank workflows with community upload and moderation support
- **Math Checker** — handwritten mathematics feedback with step-level explanations
- **Adaptive revision foundations** — weak-topic detection and targeted revision workflows
- **Gamification** — XP, levels, achievements, streaks, daily challenges, and leaderboards
- **Study organisation** — tasks, timetables, focus sessions, and analytics
- **Careers explorer**
- **PWA / offline foundations** — designed for students who cannot assume continuous connectivity

The exact maturity of individual features varies. Production reliability takes priority over claiming that every strategic capability is complete.

## The strategic direction

The next major architectural layer is **Learning Intelligence**.

### 1. Learning State Engine

Create a durable representation of learner state across concepts, mastery, confidence, recurring errors, forgetting risk, study behaviour, and intervention history.

### 2. Adaptive Intervention Engine

Move from generic recommendations toward targeted actions. For example, instead of simply saying "revise Physics", Cortex should eventually be able to identify the likely source of difficulty, choose an appropriate intervention, and measure whether that intervention improved the learner's next outcome.

### 3. Learning Graph

Longer term, connect:

`curriculum → concepts → prerequisites → questions → attempts → mistakes → interventions → mastery`

This should allow the system to reason about *why* a learner is struggling, not merely detect that they got something wrong.

### 4. Student Digital Twin

A future research direction is a privacy-conscious computational representation of the learner that grows from real evidence. This is deliberately deferred until the underlying Learning State is mature enough to justify it.

### 5. Edge and offline intelligence

Shadecode will investigate small, specialized local models for selected learning-state tasks. Heavy models can remain available for work that actually needs them.

Research areas include:

- quantization;
- knowledge distillation;
- model specialization;
- retrieval and caching;
- hybrid local/cloud inference;
- intelligent model routing; and
- other model-efficiency techniques.

The objective is **useful intelligence at low latency, low cost, small device footprint, and strong offline resilience**, not compression for its own sake.

## What we are *not* doing

The strategic vision is intentionally larger than the immediate implementation plan.

We are not going to:

- build the entire Digital Twin before the data foundation exists;
- create a giant Knowledge Graph before there is enough high-quality curriculum data;
- rewrite working systems just to fit a future architecture;
- add AI to every feature simply because AI is available;
- treat generated valuation estimates as company value; or
- spend heavily before real usage, retention, learning outcomes, and distribution justify it.

The live product should remain reliable while the intelligence layer is developed incrementally.

## Product positioning

The preferred long-term identity is:

> **Shadecode Student is a personal learning system that continuously learns how you learn.**

The product is not trying to win by being another general-purpose chatbot. Its potential moat is the combination of:

**deep curriculum + persistent learner state + adaptive intervention + offline/edge intelligence + measurable learning outcomes.**

## Business model direction

The product should prove value and retention before aggressive monetization.

Possible future models include:

- a meaningful free student tier;
- an optional Student Plus tier with deeper adaptive features and higher limits;
- school plans with teacher/classroom analytics and controlled AI; and
- future education infrastructure or APIs.

A future consumer price hypothesis of roughly **US$2–5/month** may be tested, but this is not a committed price.

## Success is measured by outcomes

Feature count is not the north star. Important metrics include:

- weekly active learners;
- retention;
- study-session frequency;
- mastery improvement;
- repeated-error reduction;
- exam performance improvement;
- intervention acceptance;
- intervention success;
- offline success rate;
- local inference latency; and
- AI cost per active learner.

The most important long-term question is:

> **Does Cortex's intervention measurably improve what the learner does next?**

## Pivot resilience

Shadecode Student is the primary validation environment, not a prison for the underlying technology.

If the student product does not achieve sufficient traction, the learning-intelligence technology can potentially be redirected toward:

- coding education;
- professional training;
- certification preparation;
- school intelligence infrastructure;
- adaptive tutoring APIs;
- enterprise learning; or
- a broader personal-intelligence platform.

The architecture should therefore preserve optionality while keeping the student experience as the main proving ground.

## Tech Stack

- **Framework:** Next.js (App Router, Turbopack) + TypeScript
- **Database/Auth:** Supabase (Postgres, RLS, Auth)
- **AI provider chain:** Cloudflare Workers AI → Gemini → OpenAI → OpenRouter, with routing/fallback behaviour evolving over time
- **Error monitoring:** Sentry
- **Deployment:** Vercel
- **PWA:** offline support via `@ducanh2912/next-pwa`
- **Testing:** Vitest
- **CI:** GitHub Actions

## Getting Started

```bash
npm install
npm run dev
```

Requires the environment variables documented in the deployment configuration. Never commit secrets to the repository.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm run start` | Serve a production build |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Run ESLint |
| `npm run test:curriculum` | Run curriculum data tests |

## Database

Schema and RLS policies live in `supabase/migrations/`. Apply migrations in order via the Supabase CLI or connected tooling.

See `docs/AUDIT_2026-08.md` for the record of recent migration-drift investigations. `scripts/check-schema-drift.js` can be used during an audit when a live schema snapshot is available.

## Cortex autonomous engineering

`.cortex/cortex-engine.js` is an engineering automation system that can inspect the roadmap, analyze repository state, generate implementation plans, and open changes for review. It is separate from the learner-facing Cortex intelligence described above.

Autonomous engineering output must still be reviewed before merging. Automation is not a substitute for engineering review.

## Strategic documents

- `docs/SHADECODE_STUDENT_2_0_LEARNING_INTELLIGENCE.md` — Learning Intelligence strategy and future architecture direction
- `docs/BLUEPRINT_GAP_MATRIX.md` — blueprint-to-repository gap analysis
- `docs/AUDIT_2026-08.md` — recent reliability/schema audit history
- `.cortex/tasks.md` — current executable Cortex engineering roadmap

## Contributing

Before opening a PR, run:

```bash
npm run lint
npx tsc --noEmit
npm test
```

CI runs the project's automated checks on pushes and pull requests to `main`.
