# Shadecode Student: Trust, Guided Learning & Defensible Focus

**Status:** Product strategy and verification plan, not a claim of completed compliance or validated learning outcomes.  
**Created:** 2026-10-18  
**Scope:** Privacy/trust foundations, pedagogical substance, differentiation, and release gates.

## Executive decision

Treat this assessment as a product-quality agenda, not a marketing problem. Shadecode Student must earn trust, demonstrate that its guided-learning claims are true in real use, and give a clearly defined learner a compelling reason to choose it over general-purpose free alternatives.

The sequence is:

**Verify data practices → explain them plainly → prove one learning loop → focus on one high-value learner workflow → test with real students → expand only when evidence supports it.**

Do not claim FERPA, COPPA, SOC 2, or other compliance without a scoped legal/security assessment and evidence. Do not imply the product is safe for school-wide or child-directed deployment until the relevant safeguards have been assessed. This document does not establish that Shadecode is compliant or non-compliant.

## 1. Trust and student-data handling

### Why this is a product requirement

Students, parents and educators need understandable answers before entrusting a learning product with personal information. Trust requires accurate disclosures, data minimization, secure access, clear retention/deletion rules, and a realistic account of third-party services.

A public privacy page is necessary, but a page alone is not compliance. It must describe verified runtime behavior and be kept synchronized with the product.

### Immediate audit checklist

Before publishing definitive privacy promises, inspect code, Supabase configuration, deployment configuration and provider settings to establish:

- [ ] What information is collected at registration and during use.
- [ ] Which learning records, prompts, generated responses, uploaded files, feedback messages and analytics events are persisted.
- [ ] Which data stays on-device and what synchronizes to cloud services.
- [ ] Which third-party processors receive data, for what purpose, and under what settings.
- [ ] Whether AI providers use submitted data for model training, and the exact applicable provider terms/settings. If unknown, say it is under verification rather than guessing.
- [ ] Who can access student records, including administrator and support access.
- [ ] Retention periods and how users can request correction/deletion.
- [ ] Whether minors can create accounts and what age-related safeguards/consent flows actually exist.
- [ ] How incidents, account compromise and suspected data exposure are handled.
- [ ] Applicable legal obligations in the jurisdictions and deployment contexts where the product is offered.

### Privacy-page minimum contents

Publish a concise, plain-language policy once each statement has been checked against actual behavior. It should cover:

1. Who operates Shadecode Student and how to contact the operator.
2. Data collected, with concrete examples.
3. Purposes for each category of data.
4. AI processing and third-party providers.
5. Whether data is used for model training, stated only when verified.
6. Storage, security controls and retention/deletion.
7. User rights and how to make a request.
8. Treatment of children/minors and school-managed accounts.
9. Changes to the policy and the effective date.
10. Known limitations and a route for privacy questions.

Avoid blanket promises such as “we never store your data,” “your data is never used for training,” or “fully compliant” unless verified and defensible. If a detail cannot yet be established, disclose the uncertainty internally and resolve it before making the claim publicly.

### School deployment gate

Before a school or district pilot, prepare a data-flow map, security review, subprocessors list, incident process, retention/deletion procedure, access controls and a school-appropriate Data Processing Agreement where required. Obtain qualified legal advice on applicable law and contract requirements. Do not present FERPA/COPPA applicability or compliance as settled by this document.

## 2. Prove guided learning through observable behavior

### The claim to validate

Guided learning must be more than a friendly prompt wrapped around a general chatbot. A learner should attempt the work, receive diagnosis of the reasoning gap, and then get a next step selected in response to that gap.

### Minimum learning loop

**Introduce → attempt → diagnose → hint → retry → adapt → check transfer → summarize evidence**

1. **Introduce:** Explain one concept or prerequisite in language suitable for the chosen syllabus and learner level.
2. **Attempt:** Ask the student to solve a meaningful step before revealing a complete solution.
3. **Diagnose:** Identify the specific misconception or invalid reasoning step from the student's actual response. Do not label a response as a misconception without sufficient evidence.
4. **Hint:** Offer the smallest useful hint, not the entire answer by default.
5. **Retry:** Give the student a chance to revise their reasoning.
6. **Adapt:** Select the next question based on the diagnosed gap and the student's retry, not just a generic sequence.
7. **Transfer check:** Test whether the learner can apply the concept to a new but related problem.
8. **Summarize:** Explain what evidence was observed, what remains uncertain, and what to practise next.

The system must permit “I cannot diagnose this reliably” and ask a clarifying question rather than inventing a diagnosis. Keep mathematical checking and mastery updates deterministic where possible; a model-generated explanation is not itself proof of mastery.

### First validation scenario: linear equations

Use a small, documented set of common errors, for example:

- Correctly solving an equation with one operation.
- Applying an operation to only one side.
- Mishandling a negative sign.
- Distributing a coefficient incorrectly.
- Combining unlike terms.
- Producing a correct answer with unclear reasoning.

For each case, record the learner's response, the diagnosis, the hint, the retry, the adapted follow-up question, and whether the learner can solve a transfer problem. Include a correct response and an ambiguous response so the test does not reward overconfident error diagnosis.

### Evidence protocol

- Use synthetic examples for public demos unless a real learner has explicitly consented to the specific use.
- Do not expose names, school details, marks, private prompts or identifiable records.
- Record the expected behavior before running the test.
- Include successful, unsuccessful and ambiguous cases.
- Report failures as well as successes.
- Separate an illustrative demo from an empirical learning-outcome claim.
- Do not claim improved grades or durable learning from one session.

### Acceptance criteria for a credible guided-learning demo

- [ ] The student must contribute reasoning, not merely select “continue.”
- [ ] At least one incorrect answer is diagnosed at the step where the reasoning fails.
- [ ] The hint responds to that specific error.
- [ ] The follow-up question changes in a way justified by the response.
- [ ] A correct answer is not needlessly treated as wrong.
- [ ] Ambiguous work triggers clarification or uncertainty, not fabricated certainty.
- [ ] A transfer question checks understanding beyond repeating the same arithmetic.
- [ ] The transcript shows the full loop and its limitations.
- [ ] The behavior is repeatable in a test, not just a carefully selected screenshot.

## 3. Choose a narrow first wedge without abandoning the platform vision

Shadecode's long-term direction can remain a personal academic operating system. The initial adoption wedge should nevertheless be specific enough that a student can immediately understand why it is useful.

Candidate wedges to compare, not commitments:

- Cambridge/ZIMSEC topic practice with mistake-specific explanations.
- A reliable guided tutor for one high-friction topic, such as Chemistry stoichiometry or Physics waves.
- A low-data study workflow that remains useful under unreliable connectivity.
- Exam practice that turns a student's actual errors into a prioritized next revision task.

Choose based on evidence, not whichever sounds most impressive. Score each candidate against:

| Criterion | Evidence to collect |
|---|---|
| Pain intensity | How often students encounter the problem and what they do today |
| Current alternatives | What free tools, teachers, notes and past papers already solve well |
| Curriculum fit | Accuracy against the relevant syllabus and question style |
| Product advantage | What Shadecode does measurably better or more reliably |
| Repeat frequency | Whether the task recurs weekly or across a study cycle |
| Reliability | Whether the workflow completes on target devices and connections |
| Cost to serve | Provider cost, local compute, storage and support burden |
| Reachability | Whether a small, relevant cohort can be recruited ethically |
| Evidence quality | Whether completion, repeat use and learning signals can be measured |

Select one primary segment and one core workflow for a short pilot. Do not market every capability as equally mature. Keep other features available where useful, but focus onboarding, demonstration and evaluation on the chosen wedge.

## 4. Competing with free alternatives

Shadecode does not win merely because it is free or has many features. General-purpose alternatives are already familiar and can provide useful explanations. The defensible advantage must come from a workflow and accumulated learning context that is genuinely valuable:

- Curriculum-aware practice and provenance.
- A persistent, user-controllable learning history.
- Mistake-specific interventions rather than generic explanations.
- Reliable recovery and useful low-connectivity behavior.
- A clear next action grounded in the learner's demonstrated work.
- Measurable repeat-use and learning signals, with uncertainty reported honestly.

These are strategic hypotheses until verified in the live product. Do not claim a moat based on architecture alone; demonstrate the benefit in a real workflow.

## 5. Prioritized execution plan

### P0: Verify privacy and security facts

1. Map data flows across browser/device, Next.js APIs, Supabase, analytics and AI providers.
2. Inspect auth, RLS, service-role boundaries, file uploads, logs and feedback storage.
3. Record retention/deletion behavior and third-party processing.
4. Draft the public privacy page from verified facts.
5. Clearly mark unresolved legal/security questions and block unsupported compliance claims.
6. Review school/minor use separately before soliciting school-wide adoption.

### P0: Choose and validate one learning workflow

1. Compare candidate wedges with a small number of target learners.
2. Choose one topic/workflow and define its expected learner journey.
3. Implement or repair the structured learning loop using existing architecture.
4. Build deterministic test cases for correct, incorrect and ambiguous responses.
5. Capture a privacy-safe demo and publish the limitations alongside it.

### P1: Run a small voluntary pilot

1. Recruit a small, clearly defined cohort.
2. Explain what data is collected and make participation voluntary.
3. Observe task completion, failure points and repeat use.
4. Ask what helped, what confused the learner and what they would use again.
5. Where suitable, use a short transfer check without claiming causal learning impact.
6. Fix the biggest observed obstacle before widening recruitment.

### P1: Earn advocacy

Ask for honest reviews only after the workflow is reliable enough and participants have enough experience to form an independent opinion. Never filter for positive sentiment, incentivize positive reviews, or use student quotes without specific permission.

## 6. Metrics and decision gates

Track a small set with stable definitions:

- **Workflow completion:** valid completed attempts / eligible started attempts.
- **Failure rate:** eligible attempts ending in a product or generation failure.
- **Diagnosis usefulness:** learner/independent reviewer assessment of whether the identified reasoning gap matches the work shown.
- **Retry recovery:** cases where a learner improves the reasoning after a targeted hint.
- **Transfer performance:** results on a new related question, reported with sample size and limitations.
- **Repeat use:** pilot participants who return and complete the same core workflow.
- **Trust blockers:** privacy, safety, correctness or consent concerns raised.
- **Cost per useful session:** relevant infrastructure/provider cost divided by completed core workflows.

Do not invent numeric targets before a baseline exists. Set thresholds after the first reliable measurements and document the reason for each threshold.

## 7. Explicit non-goals

- Do not declare FERPA/COPPA/SOC 2 compliance without evidence and appropriate review.
- Do not write a privacy policy based on assumptions about runtime behavior.
- Do not claim the guided tutor works because the prompt sounds pedagogical.
- Do not claim improved learning or grades from anecdotal feedback alone.
- Do not launch multiple new feedback, analytics or mastery systems when existing infrastructure can be reused.
- Do not scale acquisition to compensate for a broken core workflow.
- Do not abandon the broader platform vision just to create a narrow marketing slogan.

## Decision rule

At every review, ask:

**Can a clearly defined student trust this product with the relevant data, complete one important learning task reliably, and explain what Shadecode did that their current free alternative did not?**

If any answer is unknown, the next task is evidence collection or product hardening, not a bigger marketing push.
