# Offline acceptance matrix

A capability is not considered offline-ready merely because an offline model exists.

| Capability | No model | Micro | Compact | Enhanced | Network required |
|---|---|---|---|---|---|
| Tutor | Lessons/hints | Basic | Full local tutor | Full local tutor | No |
| Project Coach | Workflow/evidence/integrity | Basic coach | Full coach | Full coach | No |
| Study Planner | Full local planner | Enhanced | Enhanced | Enhanced | No |
| Question Generator | Local bank/templates | Basic generation | Full generation | Full generation | No |
| Summarizer | Local extraction where supported | Basic | Full local | Full local | No |

## Required failure tests

- Disable networking before launch.
- Restart the app while offline.
- Create and edit a project offline.
- Add evidence metadata offline.
- Complete a quiz offline.
- Generate a timetable offline.
- Force local model unavailable and verify deterministic fallbacks remain usable.
- Restore networking and verify local mutations synchronize without duplication or loss.
- Repeat with cloud AI disabled and confirm no private project data is uploaded merely to compensate.
