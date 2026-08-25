# Universal academic scope regression matrix

Every academic module must inherit the authenticated learner context.

| Module | Stage | Board | Qualification | Syllabus | Subject | Must scope? |
|---|---|---|---|---|---|---|
| Dashboard recommendations | ✓ | ✓ | ✓ | ✓ | ✓ | Yes |
| Learn generation | ✓ | ✓ | ✓ | ✓ | ✓ | Yes |
| Exam generation | ✓ | ✓ | ✓ | ✓ | ✓ | Yes |
| Practice | ✓ | ✓ | ✓ | ✓ | ✓ | Yes |
| Cortex | ✓ | ✓ | ✓ | ✓ | ✓ | Yes |
| Daily challenges | ✓ | ✓ | ✓ | ✓ | ✓ | Yes |
| Timetable | ✓ | ✓ | ✓ | ✓ | ✓ | Yes |
| Analytics | ✓ | ✓ | ✓ | ✓ | ✓ | Yes |
| Notifications | ✓ | optional | optional | ✓ | ✓ | Yes |
| Offline cache | ✓ | ✓ | ✓ | ✓ | ✓ | Yes |

## Required adversarial tests

1. A-Level Physics user requests Primary content: reject.
2. Cambridge Physics user requests another board's Physics exam: reject.
3. Physics user requests Mathematics generation without Mathematics enrolled: reject.
4. Same topic under two syllabus years: never reuse the other year's cache.
5. User changes academic context: historical attempts retain original context.
6. Missing context: show setup state, never silently guess.
7. Offline: cached content remains scoped to the original context.
8. Notification deep link: only internal safe paths are followed.
9. Direct API request bypassing UI filters: server-side scope still rejects it.
