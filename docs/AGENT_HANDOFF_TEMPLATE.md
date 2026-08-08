# Shadecode Agent Handoff Template

Copy this structure into `.cortex/agent-handoff.md` whenever active work changes hands or pauses.

```yaml
handoff_version: 1
status: ACTIVE | PAUSED | BLOCKED | AWAITING_REVIEW | COMPLETE
last_updated: YYYY-MM-DDTHH:MM:SSZ
previous_agent: ChatGPT | Claude | Copilot | Cortex | Human | Other
next_agent: ChatGPT | Claude | Copilot | Cortex | Human | Other
owner: <project owner>

work:
  track: VISION | BLUEPRINT | DOCUMENTATION | PROMPT | PRODUCT | LAB | CORTEX | INFRASTRUCTURE | RESEARCH
  task: <task title or issue/PR number>
  objective: <one paragraph>
  scope: <what is intentionally included>
  out_of_scope: <what must not be touched>

state:
  branch: <branch>
  pull_request: <PR number or null>
  base_commit: <sha>
  current_commit: <sha>
  files_changed:
    - <path>
  files_intentionally_untouched:
    - <path>

decisions:
  - decision: <decision>
    reason: <reason>
    source: <document/issue/owner decision/code evidence>

verification:
  commands_run:
    - command: <command>
      result: PASS | FAIL | NOT_RUN
      notes: <important output>
  ci_status: PASS | FAIL | PENDING | NOT_RUN

known_issues:
  - issue: <known issue>
    severity: BLOCKER | HIGH | MEDIUM | LOW
    evidence: <evidence>

next_steps:
  - <exact next action>

questions_for_owner:
  - <decision required from project owner, or NONE>

notes:
  <anything the next agent must know that is not captured above>
```

## Handoff Rules

- Update this file before relinquishing active ownership.
- Keep facts separate from assumptions.
- Use exact branch, PR, commit, file, and test information.
- Never place secrets or credentials in the handoff.
- The receiving agent must verify the state before making changes.
- Delete stale claims only when replacing them with a newer verified state.
