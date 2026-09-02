# WebMCP Challenge 2026 — Shadecode Student

## Submission concept

**Cortex: an agent-native study workspace.** A student can tell an AI agent what they need to accomplish, and the agent can use structured WebMCP tools to inspect local study state, set a goal, create a plan, start a focused session, open Exam Hub, and record completion.

The product remains human-first and local-first. WebMCP is a progressive enhancement: Shadecode Student continues to work normally when a WebMCP-capable browser is unavailable.

## Architecture

```text
AI agent
   ↓
WebMCP adapter
   ↓
Shadecode capability layer
   ↓
local-first study state
   ↓
Shadecode Student + Cortex
```

WebMCP does not create a second application, second database, or MCP-only state model. The adapter calls the same capability layer used to perform the agent-facing study actions. This keeps the integration small, testable and replaceable.

## New WebMCP work

Added during the September 2026 submission period:

- `src/components/webmcp/StudentWebMCP.tsx`
- `src/lib/capabilities/study.ts`
- Global registration from `src/app/layout.tsx`
- Local-first study capability contract
- Six agent-facing tools:
  - `get_student_study_state`
  - `set_study_goal`
  - `create_study_plan`
  - `start_study_session`
  - `open_exam_hub`
  - `finish_study_session`

These changes are intentionally additive to the existing Shadecode Student product. Existing Cortex, Exam Hub, past-paper indexing, local-first storage, and learning flows remain the product foundation.

## Judge journey

Prompt the agent:

> I have Physics tomorrow. I have 3 hours tonight. Help me turn that into an executable study session.

Expected flow:

1. `get_student_study_state`
2. `set_study_goal`
3. `create_study_plan`
4. `start_study_session`
5. Student studies in the normal Shadecode interface.
6. `open_exam_hub` when practice is needed.
7. `finish_study_session` records the outcome locally.
8. The agent can read the updated state and decide what should happen next.

The demo is therefore **goal → context → plan → action → practice → completion → adaptation**, not a tool-registration tour.

## Tool contract

| Tool | Purpose | State | Offline-safe |
| --- | --- | --- | --- |
| `get_student_study_state` | Read current study context | Read | Yes |
| `set_study_goal` | Persist an immediate goal | Write | Yes |
| `create_study_plan` | Persist an executable plan | Write | Yes |
| `start_study_session` | Start a focused session + route to Learn | Write/navigation | Yes |
| `open_exam_hub` | Route to exam practice | Navigation | Yes |
| `finish_study_session` | Persist completion + mastery | Write | Yes |

## Seamless design requirements

- No external MCP server.
- No Docker.
- No localhost service.
- No student setup step.
- No cloud AI dependency for the WebMCP state actions.
- WebMCP failure must never prevent the application from loading or studying.
- Inputs are validated and bounded before persistence.
- Each tool registers independently so one failure cannot disable the whole surface.
- SSR never touches browser WebMCP APIs.
- Local-first state remains authoritative.

If WebMCP is unsupported, the feature simply disappears and Shadecode Student remains usable.

## Why WebMCP matters

Normal browser automation makes an agent infer buttons, labels, page structure, and state. WebMCP gives the agent explicit, typed actions that match the product's real capabilities. The agent can therefore operate the learning workflow rather than merely click through its UI.

## Demo video target

Keep the video below three minutes.

Suggested structure:

- 0:00–0:20: Student problem and product context.
- 0:20–0:45: Show normal Shadecode Student UI.
- 0:45–1:35: Give the agent the three-hour Physics request and show the workflow tools being used.
- 1:35–2:10: Show the generated plan becoming a real study session and Exam Hub practice.
- 2:10–2:35: Show completion and local state persistence.
- 2:35–2:55: Explain why typed workflow actions are more reliable than UI clicking.

## Technical notes

WebMCP registration is feature-detected. The component exits without side effects when `document.modelContext` is unavailable. Registration is isolated from the rest of the application and errors are swallowed at the integration boundary by design.

The local-first capability layer bounds numeric inputs, rejects empty required values, filters empty plan steps, and persists a single structured state record. It intentionally does not make the browser dependent on a remote service.

For judging, test with a WebMCP-enabled browser as required by the official challenge rules.

## Competition disclosure

Shadecode Student is a pre-existing product. The WebMCP integration is a meaningful extension rather than a claim that the entire application was created for this challenge. The submission should explicitly identify the pre-existing product and the timestamped WebMCP extension commits.

## Submission checklist

- [x] WebMCP adapter mounted in the production application.
- [x] Shared local-first capability layer.
- [x] Six workflow-level agent tools.
- [x] Unsupported-browser fallback.
- [x] Per-tool registration failure isolation.
- [x] Input validation and bounds.
- [ ] Verify final production deployment after the latest commits.
- [ ] Record exact WebMCP extension commit/date range.
- [ ] Confirm public repository and accepted open-source licensing requirement before submission. Licensing is intentionally not changed automatically because it is a legal/product decision.
- [ ] Record final live URL and public repository URL.
- [ ] Record <3 minute demo with audio and publish on YouTube.
- [ ] Freeze the submitted project after the deadline.
