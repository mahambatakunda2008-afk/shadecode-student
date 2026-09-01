# WebMCP Challenge 2026 — Shadecode Student

## Submission concept

**Cortex: an agent-native study workspace.** A student can tell an AI agent what they need to accomplish, and the agent can use structured WebMCP tools to inspect local study state, set a goal, create a plan, start a focused session, open Exam Hub, and record completion.

The product remains human-first and local-first. WebMCP is a progressive enhancement: Shadecode Student continues to work normally when a WebMCP-capable browser is unavailable.

## New WebMCP work

Added during the September 2026 submission period:

- `src/components/webmcp/StudentWebMCP.tsx`
- Global registration from `src/app/layout.tsx`
- Local state contract under `shadecode:webmcp:study-state`
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

## Why WebMCP matters

Normal browser automation makes an agent infer buttons, labels, page structure, and state. WebMCP gives the agent explicit, typed actions that match the product's real capabilities. This makes the student workflow more reliable while preserving the existing human UI.

## Demo video target

Keep the video below three minutes.

Suggested structure:

- 0:00–0:20: Student problem and product context.
- 0:20–0:45: Show the normal Shadecode Student UI.
- 0:45–1:35: Give the agent the three-hour Physics request and show tool calls.
- 1:35–2:10: Show the generated plan becoming a real study session and Exam Hub practice.
- 2:10–2:35: Show session completion and local state persistence.
- 2:35–2:55: Explain why structured WebMCP actions are better than clicking around.

## Technical notes

WebMCP registration is feature-detected. The component exits without side effects when `document.modelContext` is unavailable. This keeps ordinary browsers, offline mode, and the existing application unaffected.

For judging, test with a WebMCP-enabled browser as required by the official challenge rules.

## Submission checklist

- [ ] Register/join WebMCP Challenge.
- [ ] Confirm live production URL exposes the six tools.
- [ ] Confirm public repository and open-source licensing requirement before submission.
- [ ] Record <3 minute demo with audio.
- [ ] Publish demo on YouTube.
- [ ] Explain which work existed before the challenge and which work was added during the submission period.
- [ ] Include live URL and public repository URL.
- [ ] Do not modify the submitted project after the deadline during judging.

## Evidence

The Git history contains timestamped WebMCP-specific commits from September 1, 2026, which can be used to distinguish the new challenge work from the pre-existing Shadecode Student codebase.
