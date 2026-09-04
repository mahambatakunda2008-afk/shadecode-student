# WebMCP Challenge 2026 Submission Copy

## Project name

Cortex: Agent-Native Study Workspace

## One-line pitch

Shadecode Student lets an AI agent turn a student's real study goal into an executable, local-first learning workflow instead of making the agent guess its way through buttons and pages.

## Description

Studying is not one isolated question. A student has limited time, a subject, weak areas, a target, practice to complete, and progress that should carry into the next session.

Cortex gives an agent a structured way to work with that learning workflow inside Shadecode Student. The agent can inspect local study context, set a concrete goal, create a revision plan, start a focused session, open Exam Hub for practice, and record completion. These are workflow-level actions rather than generic CRUD operations.

The result is a collaboration between the student and the agent: the student states the outcome, the agent helps turn it into a plan and action, Shadecode provides the learning workspace, and the resulting study state remains available for the next decision.

WebMCP is implemented as a progressive enhancement. Shadecode Student remains usable without WebMCP, and the WebMCP path does not require an external MCP server, Docker, localhost service, or cloud AI dependency for its local study-state actions.

## Why WebMCP is a strong fit

Traditional browser automation forces an agent to infer the interface. It has to discover buttons, labels, navigation, and page state. That is fragile for a learning workflow where the important unit is not a click but an intention such as "help me prepare for Physics tomorrow with three hours tonight."

WebMCP lets Shadecode expose typed capabilities that correspond to those intentions. The agent can reason about the student's goal and call the appropriate workflow action directly.

## What was difficult or impossible before

Without structured capabilities, an agent can tell a student how to study but cannot reliably operate the study workspace itself. It must guess UI structure and manually reconstruct context between actions.

With WebMCP, the agent can move through a complete workflow:

`goal → context → plan → action → practice → completion → adaptation`

The important change is continuity. The agent can read the state it just changed and use that state to decide the next useful action.

## How it is implemented

```text
AI agent
   ↓
WebMCP adapter
   ↓
protocol-neutral capability registry
   ↓
study capabilities
   ↓
local-first state
   ↓
Shadecode Student + Cortex
```

The adapter is mounted from the application root and feature-detects `document.modelContext`. Each WebMCP tool is registered independently so a single registration failure does not disable the remaining tools. The underlying actions live in a protocol-neutral capability layer, keeping the WebMCP adapter thin and making future agent protocols possible without duplicating study logic.

The six exposed workflow tools are:

- `get_student_study_state`
- `set_study_goal`
- `create_study_plan`
- `start_study_session`
- `open_exam_hub`
- `finish_study_session`

Inputs are validated and bounded before persistence. Local browser state is authoritative for the WebMCP workflow, so the core actions remain available offline.

## Demo scenario

Use this exact prompt in the demo:

> I have Physics tomorrow. I have 3 hours tonight. Help me turn that into an executable study session.

Show the agent:

1. reading study context;
2. setting the goal;
3. creating a focused plan;
4. starting the session;
5. opening Exam Hub for practice;
6. completing the session;
7. reading the updated local state.

Keep the video under three minutes, with clear audio explaining both the student experience and the WebMCP implementation.

## Testing instructions

### WebMCP

Use ChatGPT's in-app browser, which supports WebMCP, or Google Chrome 149+ with WebMCP enabled through `chrome://flags/#enable-webmcp-testing`.

### Normal app fallback

Open the live application in a normal browser without WebMCP. The application should load and remain fully usable. The WebMCP integration should have no visible failure state and should not be required for ordinary studying.

### Agent workflow

Give the agent the demo prompt above. Verify that the available WebMCP tools include the six workflow actions and that actions update the study state rather than merely describing what the student should do.

## Pre-existing project disclosure

Shadecode Student existed before the WebMCP Challenge. The submitted WebMCP work is a meaningful extension added during the Submission Period. The repository documentation records the extension commits separately from the pre-existing product work.

## Final submission checklist

- [x] Public repository
- [x] WebMCP adapter
- [x] Protocol-neutral capability layer
- [x] Six workflow-level tools
- [x] Local-first state
- [x] Unsupported-browser fallback
- [x] Per-tool registration isolation
- [x] Validation and bounded inputs
- [x] Focused tests
- [x] Timestamped WebMCP extension history
- [x] Open-source license file visible at repository top level
- [x] Final production deployment verified
- [ ] Live URL entered in Devpost
- [ ] Repository URL entered in Devpost
- [ ] Demo video uploaded publicly to YouTube
- [ ] Submission saved and submitted before the deadline
- [ ] Freeze repo, live project, and Devpost entry after submission

## Verification note (2026-09-04, day of submission)

Independently re-verified every checked item above by reading the actual
code and running it, not by trusting prior checkmarks:

- `LICENSE` at repo root: confirmed via GitHub's own API (`GET /license`)
  as a real, complete MIT license, correctly recognized, repo confirmed
  public.
- `StudentWebMCP.tsx`: confirmed feature-detected (checks for
  `navigator.modelContext` before doing anything), per-tool isolated via
  `Promise.allSettled` (one tool failing to register doesn't block the
  other five), retry loop capped at 120 attempts \u00d7 250ms, renders
  `null` (zero DOM/visual footprint either way).
- All six tools' `inputSchema`s: confirmed real JSON Schema bounds
  (`minimum`/`maximum`/`minItems`/`maxItems`/`required`) on every
  parameter that needs one \u2014 not just present-but-empty schemas.
- Capability layer (`src/lib/capabilities/study.ts`): confirmed
  protocol-neutral (five state-mutating tools route through it;
  `open_exam_hub`, the one pure-navigation tool, correctly doesn't need
  a capability function).
- Tests (`src/lib/capabilities/study.test.ts`): ran directly, 5/5 pass.
- Global mount (`src/app/layout.tsx`): confirmed `<StudentWebMCP />` is
  actually rendered inside the root layout tree (not just written and
  never wired in), positioned so SSR never touches browser-only WebMCP
  APIs (the component itself is a client component; the server tree
  only renders a placeholder).
- Production: confirmed live via a direct fetch of
  `https://shadecodestudent.vercel.app` \u2014 200 OK, correct branding,
  matches the repository's current `main` branch. Also confirmed via
  GitHub's commit-status API and Vercel's deployment list that the
  latest commit on `main` is the most recent deployment and is `READY`.

Everything above is genuinely correct, not just present. The five
remaining unchecked items are all external actions (Devpost form
fields, video recording/upload, the submit action itself) that need to
happen from your side \u2014 nothing else in the codebase is blocking them.
