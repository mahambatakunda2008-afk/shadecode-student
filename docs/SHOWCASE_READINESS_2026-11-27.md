# Shadecode Student — 27 November 2026 Showcase Readiness

**Event:** School Speech and Prize Giving Day  
**Date:** 27 November 2026  
**Prepared:** 16 November 2026  
**Tracking issue:** #600

## Purpose

Prepare a truthful, reliable live demonstration of Shadecode Student for an audience that may include the school owner and government officials. The event is an opportunity to demonstrate useful student-facing technology, listen to feedback, and earn follow-up conversations. It is not evidence of endorsement, adoption, funding, or procurement.

## Success criteria

By the event:
- One or two core student workflows have passed repeatable end-to-end tests.
- The selected flow works on the actual presentation device and browser.
- The demonstration does not depend on an AI provider being available.
- Any offline capability shown has passed a real airplane-mode, reload/reopen and reconnect test.
- A backup demonstration is available if the live network or service fails.
- A concise product explanation, one-page brief and opt-in follow-up route are ready.
- Every public claim is supported by current product evidence.

## Initial release-state snapshot (16 November 2026)

- The Vercel production deployment for `shadecodestudent.vercel.app` was reported **READY**.
- Its source was `main` at commit `41b892867d643afb30184313b0c61095956d39f8`, whose message concerns a Learn quick-start topic-length bug fix.
- A PR-triggered workflow lookup for that commit returned no runs. This does not establish that CI passed; required checks must be inspected directly.
- Open PRs include work on offline XP replay safety (#599), the local-first adoption/sync contract (#598), security hardening (#593, #595), account-deletion schema reconciliation (#596), and Teacher/educator capabilities (#576–#578). An open PR is not a shipped capability or a release approval.
- The repository README explicitly notes that feature maturity varies and prioritizes trustworthy learning evidence, offline sync, Learn/Exam Simulation stability and verified curriculum coverage.

This snapshot must be refreshed before the final rehearsal. A READY deployment proves deployment status, not that each user workflow works end to end.

## Workstream A — Select the demonstration

Do not choose a workflow because it looks impressive in a screenshot. Choose it after direct testing.

Candidate sequence:
1. Start with a real student problem: fragmented study tools, unclear weak areas and unreliable connectivity.
2. Demonstrate one complete learning task from entry to feedback.
3. Show that the learner can return to the saved result or progress.
4. Show one evidence-based next step only if it is genuinely connected to the learner's recorded activity.
5. Demonstrate offline use only if the exact path passes the acceptance tests below.

Prefer deterministic, model-independent paths for the live demo. If a cloud model is part of the selected flow, prepare a tested fallback and explain the difference honestly.

## Workstream B — Acceptance tests

### Core workflow
- [ ] Sign in with a dedicated demo account.
- [ ] Select a subject and level appropriate to the demonstration.
- [ ] Complete the chosen learning or assessment task.
- [ ] Verify answers, marking and feedback are correct for the chosen example.
- [ ] Confirm the result is durably saved.
- [ ] Leave the screen, return and reopen the result.
- [ ] Repeat the workflow at least three times without data loss or confusing failure states.

### Resilience
- [ ] Test the chosen flow with AI providers unavailable or disabled.
- [ ] Confirm no false success state is shown when generation or saving fails.
- [ ] If offline use is demonstrated: enable airplane mode, reload/reopen, complete the selected offline task, inspect persistence, reconnect and verify safe synchronization.
- [ ] Test a recoverable interruption, such as closing and reopening the app.
- [ ] Record exactly which actions still require a network or cloud service.

### Presentation setup
- [ ] Test on the actual laptop/device, browser and display resolution.
- [ ] Check text size, contrast, navigation and display scaling from the audience's viewing distance.
- [ ] Confirm power, charging, network and hotspot contingencies.
- [ ] Prepare a locally available screen recording or screenshots as a backup, clearly labelled as a recording rather than a live interaction.

## Workstream C — Presentation materials

Prepare:
- A 3–4 minute demonstration, adjusted to the organizer's time limit.
- A short introduction explaining the student problem and Shadecode's purpose.
- A one-page product brief with current capabilities, limitations and contact details.
- A QR code and typed fallback route to the verified product entry point.
- A short list of answers to likely questions about curriculum coverage, AI reliability, offline operation, privacy and school adoption.

Do not claim:
- Government or school endorsement.
- Improved grades or measured learning outcomes without valid evidence.
- Universal curriculum coverage.
- Fully offline AI if the actual flow depends on a cloud model.
- That a feature is available simply because its PR is open or its screen exists.

## Workstream D — Event logistics and privacy

- [ ] Confirm whether the slot is a stage presentation, exhibition/demo table, or both.
- [ ] Confirm the time limit, projector/display, audio, internet and power arrangements.
- [ ] Confirm permission before using the school name, logo, photos, recordings or identifiable student examples.
- [ ] Use a dedicated demo account and synthetic/non-sensitive data.
- [ ] Do not expose real learner profiles, marks, messages, contact details or private records.
- [ ] Capture follow-up details only from people who explicitly volunteer them.

## Timeline

| Date | Gate |
|---|---|
| 16–18 Nov | Audit current production, open work and CI; select a candidate demo path |
| 19–21 Nov | Fix only demo-blocking defects; verify the complete chosen workflow |
| 22–23 Nov | Prepare script, product brief, demo account, QR route and backup |
| 24–25 Nov | Rehearse on the actual device and display; test failure contingencies |
| 26 Nov | Release freeze; final smoke test; no risky feature work |
| 27 Nov | Demonstrate, listen and follow up only with interested people |

## Release discipline

- No risky production schema, security or data changes solely to meet the event date.
- No broad feature expansion at the expense of a dependable demonstration.
- No last-minute feature additions after rehearsal freeze unless they fix a confirmed critical defect and can be fully retested.
- Keep the product useful for students as the primary goal. The audience's reaction is a possible outcome, not the product's acceptance test.

## Completion record

Update this document with:
- The exact demo workflow and tested device/browser.
- Test date and pass/fail results.
- Verified offline and AI-unavailable boundaries.
- The exact product commit deployed for the event.
- The final presentation duration and backup method.
- Remaining known limitations disclosed during the demonstration.
