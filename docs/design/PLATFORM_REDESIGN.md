

## Validation update (2026-10-16)
- [x] CI for head commit `98f3c22e69efbc9e1a20f742f7b30ce6023f8b24` passed TypeScript, lint, tests, and production build.
- [x] The matching Vercel preview reached READY. Anonymous smoke requests to the landing, login, sign-up, Learn, Exam Hub, Exam Simulator, Math Checker, Focus, Timetable, Study Plan, and Settings routes returned HTTP 200.
- [ ] These HTTP smoke checks do not prove authenticated interactions, browser-rendered layout quality, mobile breakpoints, or the complete lesson-generation workflow. Those still need real browser/session validation.
- [x] Cortex Learn generation policy fix: authenticated online requests now try the cloud/Cortex path before using a verified authored lesson; offline or unauthenticated requests may use exact curated recovery immediately. This prevents a known authored fallback from silently pre-empting AI generation for a signed-in online learner.
- [ ] PR remains draft and unmerged. Production has not been deployed by this redesign work.
