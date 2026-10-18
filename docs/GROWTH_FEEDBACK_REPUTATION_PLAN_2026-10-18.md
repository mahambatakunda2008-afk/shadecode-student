# Shadecode Student: Growth, Feedback & Reputation Plan

**Status:** Strategy and execution contract  
**Created:** 2026-10-18  
**Scope:** Feedback, student pilot, retention, trustworthy reputation, distribution and growth measurement.

## Executive decision

Move from launch-driven promotion to an evidence-led growth loop:

**Reliable student value → meaningful use → useful feedback → product improvement → repeat use → honest advocacy → qualified new users → measured learning value.**

Reviews are an outcome, not the primary product objective. Never manufacture reviews, trade rewards for positive ratings, pressure students, or claim grade improvement without evidence. First learn which student segment and workflow Shadecode Student can serve reliably enough that learners return and voluntarily recommend it.

This plan complements the master roadmap. It does not override reliability, privacy, learning-evidence or release requirements.

## 1. Problem framing

Investigate the full adoption funnel instead of assuming awareness is the only bottleneck:

1. **Awareness:** Do target students know the product exists?
2. **Activation:** Do new users complete a meaningful learning activity?
3. **Reliability:** Can they complete it without avoidable failures?
4. **Retention:** Do they return because it remains useful?
5. **Value:** Do they report better understanding, practice or study organization?
6. **Advocacy:** Do they voluntarily recommend it or leave an honest review?
7. **Distribution:** Can we reach similar students repeatedly rather than relying on a one-time launch?

## 2. Operating principles

- Start with a specific student, real academic task and costly point of friction.
- Registrations, downloads and upvotes are not substitutes for repeat use or demonstrated value.
- Reliability comes before scaling acquisition.
- Never fabricate mastery, scores, outcomes, testimonials, user counts or capabilities.
- Invite honest reviews, never only positive reviews. Do not condition access or rewards on positive sentiment.
- Collect the minimum necessary data; explain why it is collected and how it is used.
- Keep feedback low-friction and suitable for modest devices and unreliable connections.
- Reuse existing architecture instead of creating competing analytics or mastery systems.
- Improve the current product; do not redesign the whole application solely for growth.
- Marketing claims must match the product's actual maturity and available evidence.

## 3. Workstream A: reliability baseline

Audit these high-value workflows before a growth push:

1. Sign up and sign in.
2. Find a relevant Learn topic.
3. Complete or resume a lesson.
4. Use Cortex to clarify a concept.
5. Practise questions or use Exam Simulation.
6. Review progress and choose a next study action.
7. Recover from network interruption or generation failure.

For each workflow, establish whether it completes on target devices, shows clear progress and failure states, preserves useful work on retry, logs safe actionable errors, and lets the student report a problem. Verify analytics authorization and deduplication.

**Gate:** Do not scale promotion of a workflow until its critical failure modes are understood and acceptable. Document known limitations rather than claiming perfection.

## 4. Workstream B: lightweight feedback loop

### Entry points
- An unobtrusive **Send feedback / Report a problem** action in the app or settings.
- Contextual feedback after a meaningful lesson, practice session or Cortex interaction.
- An optional experience question after the learner has enough experience to answer.

Do not show surveys after every action. Respect dismissal and avoid repeatedly interrupting students who decline.

### Categories
- Something is broken
- Explanation/content may be incorrect
- I am still confused
- I could not find what I needed
- Performance/connectivity issue
- Suggestion/other

### Suggested session question
**“Did this help you understand the topic?”**
- Yes, I understand it better.
- Somewhat, I still have questions.
- No, I am still confused.
- Something appears incorrect.
- Skip.

Self-reported understanding is useful feedback, not proof of learning. Where suitable, validate value with a small topic check or later retrieval practice without burdening the learner.

### Minimum feedback record
Subject to privacy/security review, capture only what is needed:
- Feedback ID, category and optional message
- Feature/workflow context
- Optional related activity/event ID
- Timestamp, triage status and optional severity
- Resolution note or linked issue

Do not log secrets, authentication tokens, full private conversations or unnecessary student data. Make identity optional where practical; if identity is needed for triage, explain that clearly.

### Triage lifecycle
**New → Triaged → Investigating → Planned / Fixed / Cannot reproduce / Not planned → Closed**

Recurring high-impact reports need an owner or linked issue. Collection without review and action is not a feedback loop.

### Architecture guardrails
- Inspect existing feedback, analytics, event and insight code before adding a schema.
- Reuse the canonical learning-event pathway for appropriate events, but do not overload it with free-text feedback.
- If a dedicated Supabase table is necessary, use a reviewed migration with explicit RLS, least-privilege access, validation and retention considerations.
- Server-side authorization is authoritative; client-side hiding is not security.
- Do not create a competing source of truth for mastery or analytics.
- Add appropriate abuse/rate controls.
- Feedback failure must never block a learning task.

## 5. Workstream C: focused student pilot

### First cohort
Recruit **10 willing students** as a target, not as a claim about current participation. Start with one defined segment and one or two workflows. Potential channels include subject-specific study groups, school contacts, a Computer Science community, or university/polytechnic students. Ask group administrators for permission before posting.

Do not recruit across every level and subject at once; a narrow cohort produces more interpretable evidence.

### Two-week protocol

**Before**
- Confirm the selected workflow is usable and disclose known limitations.
- Prepare concise onboarding and a feedback guide.
- Define success measures before seeing results.
- Explain data collection and intended use.
- Make participation voluntary and allow participants to stop.

**Week 1**
- Ask participants to complete one real academic task.
- Observe activation, task completion, failure points and questions.
- Request one concise feedback response after a meaningful session.
- Fix urgent pilot-blocking defects through normal review and testing.

**Week 2**
- Check whether participants return without repeated personal chasing.
- Ask what was useful, confusing, missing or unreliable.
- Where appropriate, compare a small learning check with a defined baseline. Do not infer causality from an uncontrolled pilot.
- Ask whether they would keep using the product and why.
- Invite an honest public review only after participants have enough experience to form an opinion.

### Pilot questions
1. What task were you trying to complete?
2. Did you finish it?
3. What helped you most?
4. Where did you get stuck?
5. Did you return? Why or why not?
6. What would make you continue using it?
7. Would you recommend it to a classmate? What would you tell them?

### Exit decision
- **Reliability problem:** fix the workflow before recruiting more students.
- **Activation problem:** simplify onboarding and the first useful task.
- **Retention problem:** investigate value, workflow fit and repeat-use friction.
- **Clear value, low awareness:** expand the same distribution channel.
- **Mixed results:** narrow the segment/workflow and run a smaller follow-up.

Registrations or positive comments alone do not establish pilot success.

## 6. Workstream D: measurement

Use trustworthy existing analytics/events first; add only missing instrumentation.

| Metric | Working definition | Purpose |
|---|---|---|
| Qualified visit | Visit from the intended segment, where measurable | Relevant reach |
| Activation | New user completes a predefined meaningful action within a defined window | First value, not signup |
| Task completion | Started target workflows reaching valid completion | Friction and reliability |
| D1 retention | Activated users returning the next day | Early repeat use |
| D7 retention | Activated users returning on day 7 or a defined day-7 window | Repeat use |
| Workflow reliability | Valid successful completions divided by eligible attempts | Technical quality |
| Feedback response | Eligible sessions with a response, accounting for opt-outs | Feedback coverage |
| Issue recurrence | Repeated reports for the same failure class | Prioritization |
| Referral activation | Referred users completing a meaningful action | Useful word of mouth |
| Public reviews | Genuine reviews published on each platform | Reputation, not learning |
| Learning signal | Defined measure such as a topic check or later retrieval | Educational value |

For every metric, document event source, eligibility rule, time window, denominator and blind spots. Do not compare cohorts using changing definitions. Prefer aggregated reporting, restrict access to identifiable records and document retention.

## 7. Workstream E: honest advocacy and testimonials

Invite reviews after the student has enough experience, ideally after a meaningful workflow or the pilot. The invitation must permit praise, criticism or no review.

Suggested wording:

> You've been trying Shadecode Student, and we'd value your honest feedback. What has helped, what has not worked, and what should we improve? If you've used it enough to form an opinion, you're also welcome to share an honest public review so other students can make an informed choice.

Never suppress negative experiences, ask only for positive reviews, buy or fabricate reviews, or treat Product Hunt upvotes as a substitute for substantive feedback. Do not publish a student's name, image, marks, school or quote without informed permission.

Use testimonials only with explicit permission for the specific quote and context. Preserve the meaning, record consent and do not edit a quote into a stronger claim. Anonymized details can still identify someone in a small community, so assess context.

Ensure public listings describe the product's actual maturity and limitations. Public reviews are one reputation channel, not the whole growth strategy.

## 8. Workstream F: distribution experiments

Run one small experiment at a time, with a defined audience, offer, time window and success metric.

### Experiment 1: student study group
- Audience: one relevant high-school or subject-specific group.
- Offer: a practical workflow for a specific topic.
- Ask permission for a short voluntary pilot and honest feedback.
- Measure qualified visits, activation, repeat use and feedback.
- Respect group rules; never spam or scrape member information.

### Experiment 2: university/polytechnic cohort
- Audience: one course/community with a clear workflow need.
- Offer: revision, coursework organization or a specific learning task.
- Measure completion, repeat use and unmet needs.
- Validate course fit and content accuracy before broad promotion.

### Experiment 3: student creator trial
- Choose a small creator whose audience matches the target learner.
- Offer a genuine hands-on trial, not a scripted endorsement.
- Disclose material relationships or compensation; the creator must be free to criticize.
- Measure qualified and activated users, not views alone.
- Never pay for positive opinions or imply unobserved results.

### Experiment 4: shareable study artifact
- Test whether students value sharing a revision checklist, timetable or topic practice resource.
- Make sharing explicit and user-controlled.
- Never expose private learning records by default.
- Measure whether shared artifacts bring users who activate and return.

### Experiment log
For each test, record hypothesis, audience/channel, message/offer, dates, effort/cost, qualified reach, activated users, repeat users, feedback/failures and the decision to repeat, modify or stop.

Repeat channels that produce retained users and actionable learning, not just clicks.

## 9. Execution sequence

### Phase 0: inspect before building
1. Search for existing feedback, analytics, canonical events and reporting.
2. Audit critical workflows and failure telemetry.
3. Review privacy, RLS, event definitions and data retention.
4. Document what exists, what is reliable and what is missing.

### Phase 1: smallest useful feedback loop
1. Add/improve one low-friction feedback entry point.
2. Add contextual feedback to one high-value workflow.
3. Reuse existing triage visibility where practical.
4. Test validation, authorization, abuse controls, failure handling and mobile usability.
5. Verify submission failure never blocks learning.

### Phase 2: baseline and pilot
1. Define activation and retention events.
2. Validate metric definitions against real event data.
3. Recruit a voluntary cohort.
4. Run the two-week pilot.
5. Summarize findings, including negative results and limitations.

### Phase 3: fix and earn advocacy
1. Prioritize high-impact issues.
2. Re-test affected workflows.
3. Invite honest feedback/reviews without pressure.
4. Obtain explicit permission for public testimonials.
5. Record changes to reliability, activation and retention.

### Phase 4: repeatable growth
1. Run one distribution experiment at a time.
2. Compare channels by activated and retained users.
3. Improve onboarding for the best-performing segment.
4. Expand only when reliability and cohort evidence support it.
5. Update this plan as evidence accumulates.

## 10. Initial acceptance criteria

- [ ] Existing feedback and analytics implementations inspected before adding new ones.
- [ ] First target segment and workflow stated.
- [ ] Core workflow failure modes documented.
- [ ] Feedback is optional, low-friction and never blocks learning.
- [ ] Server-side authorization and appropriate RLS protect feedback data.
- [ ] Submission has clear success/failure states.
- [ ] Metric definitions and sources are documented.
- [ ] Voluntary pilot protocol and honest-review request are ready.
- [ ] No fake reviews or unsupported learning-outcome claims.
- [ ] Test, lint, type-check and build results are reported accurately for code changes.

## 11. First deliverables

1. **Repository audit:** feedback paths, event instrumentation, relevant tables/RLS and reliability signals.
2. **Gap report:** implemented versus missing.
3. **Implementation plan:** exact files, migration needs, tests and release risks.
4. **Minimal feedback implementation:** only if the audit confirms it is needed.
5. **Pilot kit:** recruitment message, participant instructions, short feedback form and findings template.
6. **Growth experiment log:** hypotheses and results by channel.

## 12. Decision rule

At each review, ask:

**What is the biggest evidenced obstacle preventing a target student from receiving reliable value and returning?**

Fix that obstacle before adding more features or spending more effort on promotion. The long-term aim is a product students can rely on, that improves their learning workflow, and that earns a trustworthy reputation through real use.
