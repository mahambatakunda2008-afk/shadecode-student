# Guided Session UX and Latency Acceptance Gates

**Date:** 2026-10-18  
**Status:** Acceptance plan; not a claim that the full application or production latency has passed.

## Changes in this branch

- The Socratic Tutor now exposes a simple four-step session progress indicator.
- The student response area is explicitly labelled “Your attempt” and supports multiline working.
- The tutor response prompt is constrained to under 180 words, prefers one next step/question, requires uncertainty when appropriate, and prohibits unsupported diagnoses.
- If a tutoring request throws, the attempted text is restored, the optimistic student message is removed to avoid duplicate submissions on retry, and an inline recovery message appears.
- Explanation-request failures show an inline message without clearing the existing conversation.

## Scope boundaries

This is a focused improvement to the existing Socratic Tutor, not a redesign of every Shadecode Student screen. It does not add a new provider, does not claim that streaming is implemented, does not claim a 15-second hard end-to-end deadline, and does not establish that all failures are recoverable. The existing hybrid generation implementation still needs to be inspected and measured before changing provider retry policy or adding streaming.

## Acceptance checklist

### Session clarity

- [ ] Mobile viewport: progress indicator and attempt area fit without horizontal overflow.
- [ ] Keyboard and screen-reader use: labelled attempt field, meaningful progress state, visible error with alert semantics.
- [ ] Empty state tells students what to do first and avoids a long opening lecture.
- [ ] After multiple attempts, progress language remains accurate and does not imply mastery based only on message count.
- [ ] The completed-session experience summarizes what was learned, remaining uncertainty, and a next action before this is advertised as a complete learning loop.

### Failure recovery

- [ ] Force a tutoring API/provider failure and confirm the exact draft is restored.
- [ ] Retry once and confirm the student attempt is not duplicated.
- [ ] Force an explanation-request failure and confirm earlier messages remain.
- [ ] Confirm loading state is cleared for success and failure.
- [ ] Confirm a successful response clears stale failure messaging.
- [ ] Confirm no raw provider exception or secret is shown to the student.

### Pedagogical behavior

- [ ] Correct working receives accurate acknowledgement.
- [ ] Distribution/sign errors are addressed only when the student's work supports the diagnosis.
- [ ] Ambiguous attempts trigger clarification.
- [ ] Response is concise and asks for a useful next action where appropriate.
- [ ] Transfer question and end-of-session recap are validated in the full learning journey.

### Performance and reliability follow-up

Measure, do not guess:
- Time to first visible useful response.
- Total response duration, including provider fallback.
- Request timeout/failure rate by stage.
- Percentage of failed requests where draft recovery works.
- Output length and structured-output validation failures.

Streaming, provider-specific retries and a total deadline must be designed around the existing hybrid runtime and its current budgets, with retries limited to transient failures. Do not add a second competing retry loop. Do not advertise a “never wait more than 15 seconds” guarantee until end-to-end measurements and enforcement support it.

## Release rule

Run typecheck, lint, unit tests, build and authenticated browser journeys. Review the responsive layout and keyboard behavior. Keep the production deployment unchanged until the PR is validated and merged through the established release workflow.
