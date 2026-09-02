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
protocol-neutral capability registry
   ↓
study capabilities
   ↓
local-first study state
   ↓
Shadecode Student + Cortex
```

WebMCP does not create a second application, second database, or MCP-only state model. The adapter calls a protocol-neutral capability registry, keeping agent access aligned with product actions and leaving room for future agent protocols.

## New WebMCP work

Added during the August 25–September 3, 2026 submission period:

- `src/components/webmcp/StudentWebMCP.tsx`
- `src/lib/capabilities/index.ts`
- `src/lib/capabilities/study.ts`
- `src/lib/capabilities/study.test.ts`
- Global registration from `src/app/layout.tsx`
- Local-first study capability contract
- Six agent-facing tools:
  - `get_student_study_state`
  - `set_study_goal`
  - `create_study_plan`
  - `start_study_session`
  - `open_exam_hub`
  - `finish_study_session`

The adapter treats registration as progressive enhancement: each tool is attempted independently, readiness is recorded only after at least one registration succeeds, and the integration does not affect normal app loading when WebMCP is absent.

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
8. The agent reads the updated state and can decide what should happen next.

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
- No cloud AI dependency for WebMCP state actions.
- WebMCP failure never prevents the application from loading or studying.
- Inputs are validated and bounded before persistence.
- Each tool registers independently.
- SSR never touches browser WebMCP APIs.
- Local-first state remains authoritative.

If WebMCP is unsupported, the feature simply disappears and Shadecode Student remains usable.

## Why WebMCP matters

Normal browser automation makes an agent infer buttons, labels, page structure, and state. WebMCP gives the agent explicit, typed actions that match the product's real capabilities. The agent can therefore operate the learning workflow rather than merely click through its UI.

## Demo video target

Keep the video below three minutes and include clear audio.

Suggested structure:

- 0:00–0:20: Student problem and product context.
- 0:20–0:45: Show normal Shadecode Student UI.
- 0:45–1:35: Give the agent the three-hour Physics request and show the workflow tools being used.
- 1:35–2:10: Show the generated plan becoming a real study session and Exam Hub practice.
- 2:10–2:35: Show completion and local state persistence.
- 2:35–2:55: Explain why typed workflow actions are more reliable than UI clicking.

## Technical notes

WebMCP registration is feature-detected. The component exits without side effects when `document.modelContext` is unavailable. Registration is isolated from the rest of the application and errors are contained at the integration boundary by design.

The local-first capability layer bounds numeric inputs, rejects empty required values, filters empty plan steps, records completion/mastery, and persists a single structured study state. Focused Vitest coverage exercises persistence, normalization, validation, completion, and storage-read failure handling.

For judging, use ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled, as required by the official challenge rules.

## Timestamped extension commits

- `67fe7deeea2385890a188c97dfcfc33f4508fcd1` — add study capability layer.
- `0553cf31fa728155344698b8a70cdcb8a54252dd` — refactor WebMCP adapter onto capabilities.
- `0b65c0aee6b8351618f39bbedd7008e980c15c84` — document WebMCP submission architecture.
- `90efcd335ed94a14e94f163e7c984eaf6fa5ea75` — clean adapter imports/registration.
- `5fc23b6d13102048d4e39bb9a2a2fb509dab906d` — add capability-layer tests.
- `b17dc50210bd6464b9c84891e6e7e327a0e0f6b6` — make tool registration retry-safe and observable.
- `9625df697e333671430c30c4dc725315fcf0b43c` — refactor adapter to the protocol-neutral capability registry.
- `7d82e46aeb9c5efac272978890c6f10df1e7ed1d` — align learning-state tests with the shared transition.
- `5ba1a683855bf54eb8c52e3645ab5d246fcc0aa1` — align shared mastery transition test with deterministic rounding.

## Competition disclosure

Shadecode Student is a pre-existing product. The WebMCP integration is a meaningful extension rather than a claim that the entire application was created for this challenge. The submission should explicitly identify the pre-existing product and the timestamped WebMCP extension commits.

## Submission checklist

- [x] WebMCP adapter mounted in the production application.
- [x] Shared protocol-neutral capability registry.
- [x] Six workflow-level agent tools.
- [x] Unsupported-browser fallback.
- [x] Per-tool registration failure isolation.
- [x] Input validation and bounds.
- [x] Focused capability-layer tests.
- [x] Public GitHub repository.
- [ ] Confirm an open-source license file is present and visible on the repository before submission. This is a required competition condition and remains a deliberate legal/product decision.
- [ ] Verify final production deployment after the final code commit.
- [ ] Record final live URL and public repository URL in Devpost.
- [ ] Record and publish the <3 minute YouTube demo with audio.
- [ ] Submit on Devpost before September 3, 2026 at 1:00 PM PDT.
- [ ] After submission, freeze the submitted repo, live project, and Devpost entry until judging ends.
