# Guided Session UX and Latency Acceptance Gates

**Date:** 2026-10-18  
**Status:** Acceptance plan; not a claim that the full application or production latency has passed.

## Changes in this branch

- The Socratic Tutor now exposes a simple four-step session progress indicator.
- The student response area is explicitly labelled “Your attempt” and supports multiline working.
- Students can choose structured help actions: a more specific hint, more detail, a different method, an explanation of the tutor’s question, or a worked solution followed by independent practice.
- The opening copy explains why the tutor may ask about the student’s reasoning while explicitly allowing fuller explanations on request.
- A minimal progress trace shows attempts recorded and clearly labels independent understanding as unverified until a real check exists. It does not equate message count with mastery.
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

### Student agency and expectation management

- [ ] Each structured help action sends the intended request and handles failure without losing the student's current work.
- [ ] “Show worked solution” returns a genuinely worked explanation when the student requests it, followed by a similar independent practice item.
- [ ] Direct requests for an answer do not trigger endless repetitive questioning; adapt the amount of help to the student's expressed need.
- [ ] The opening explains the purpose of guided questions without presenting answer withholding as a rule students must endure.
- [ ] Progress trace labels attempts separately from demonstrated understanding; never infer mastery from message count.
- [ ] Observe five real students without explaining the design first. Record first point of impatience, exact bypass phrasing, help-control use, abandonment points, and performance on a follow-up question. Ask permission before observing and do not collect unnecessary identifying information.

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

## Research note and evidence discipline

The product hypothesis is that real students may switch to direct-answer requests when guided interaction feels costly, and that student agency plus clear expectations may reduce frustration. Treat this as a hypothesis to validate with Shadecode Student users, not a universal law.

Relevant research located for this design pass:
- Liu et al., “Discerning Minds or Generic Tutors? Evaluating Instructional Guidance Capabilities in Socratic LLMs,” ICLR 2026 / arXiv preprint: https://openreview.net/pdf/45b8699259d4cda5ec1e78fac41804744b9fd836.pdf. It uses authentic tutoring dialogues to study adaptive guidance, but does not by itself validate the exact claim that 940 ICML 2026 records show lower tolerance in the wild.
- Davazdahemami and Rasouli Dezfouli, “Socratic AI Tutors in Introductory Programming,” AMCIS 2026: https://aisel.aisnet.org/treos_amcis2026/74/. The abstract reports 95 valid AI-student interactions and highlights differences by prior experience and technical English proficiency, supporting attention to learner context and interaction burden.
- “Hey Chat, Can You Teach Me? Structuring Socratic Dialogue for Human Learning in the Wild,” arXiv: https://arxiv.org/abs/2606.11744. This work motivates structuring multi-turn tutoring around inferred learner knowledge rather than relying on model scale alone.

The supplied attribution to an “ICML 2026 study of 940 records” and the specific ACM predefined-button study were not independently verified in this search. Do not repeat those exact details in public marketing or product docs until the original papers are identified. The five-student observation is a small formative study, not evidence of learning efficacy or broad market demand.
