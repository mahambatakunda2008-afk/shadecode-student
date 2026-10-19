# Shadecode Student: Student Pilot Kit

**Prepared:** 2026-10-19  
**Purpose:** Run a small, honest, low-cost pilot to find whether Shadecode Student reliably helps a specific group of students complete real study tasks.  
**Status:** Ready to adapt; do not start a cohort until the selected workflow has passed a basic internal smoke test.

## 1. Pilot rules

- Start with 5–10 willing students from one defined segment, subject area or course.
- Run for two weeks. Participation is voluntary; participants can stop at any time.
- Do not promise grades, guaranteed accuracy, or features that have not been verified.
- Tell participants that Shadecode Student is an early product and ask them to report failures as well as successes.
- Do not require a positive review, public post, referral, or testimonial. No reward depends on sentiment.
- Collect only information needed to run the pilot. Do not ask for passwords, private school records, marksheets, or unrelated personal information.
- Ask permission before sharing any quote, name, school, image, or identifiable story publicly.
- Do not add participants to marketing lists or groups without separate consent.
- If a core workflow repeatedly fails, pause recruitment and fix it.

## 2. Pick one cohort and one target task

Before inviting anyone, complete this mini-brief:

- **Student segment:** [e.g. Cambridge AS Physics students]
- **Target task:** [e.g. understand one Waves concept and attempt a short set of practice questions]
- **Current alternative:** [notes, textbook, teacher, past papers, another app]
- **Expected useful outcome:** [a concrete task completion, not a vague promise]
- **Workflow tested internally on:** [device/browser/network conditions]
- **Known limitations disclosed:** [list]
- **Pilot owner:** [name/role]
- **Start and end dates:** [dates]
- **Primary success measure:** [choose one]
- **Stop condition:** [e.g. repeated lesson-generation failures or data/privacy concern]

Only include product features that are currently accessible and have passed a smoke test. If lesson generation is unreliable, do not make generated lessons the pilot's critical path. Select a workflow that is usable today or postpone the cohort.

## 3. Ask a group administrator first

Use this message before posting in a school, WhatsApp, Discord, or course group.

> Hi. I'm working on Shadecode Student, a student-built learning platform, and I'm looking for a small number of students to try one specific study workflow for two weeks and give honest feedback. It's an early pilot, not a request for endorsements. Participants can report problems or stop at any time, and no one will be asked for a positive review. Would it be okay to share a short invitation in the group? I'll follow the group's rules and won't collect member details.

If the administrator declines or does not respond, do not post there.

## 4. Student invitation

> **Want to help test a student-built study tool?**
>
> I'm inviting 5–10 students to try Shadecode Student for two weeks while working on a real study task: [insert target task]. The goal is to learn whether the workflow is useful, what breaks, and what should improve.
>
> This is an early product, so some parts may be rough. Please use it only if you're comfortable with that, and don't enter passwords, private records, or sensitive information into feedback. Taking part is optional, and you can stop at any time. I'll ask a few short questions about what worked and what didn't. There's no requirement to post publicly, refer friends, or leave a review.
>
> Interested? Reply privately with the subject/task you'd like to try. Please don't share personal school records or marks.

Adapt the invitation so it accurately reflects the current product and the audience. Do not claim the pilot has already produced results.

## 5. Participant start card

Send each participant the same concise instructions:

1. Open Shadecode Student: https://shadecodestudent.vercel.app
2. Try the agreed task: [exact steps].
3. Note whether you completed it, where you got stuck, and whether you needed another resource.
4. If something fails, capture the exact error text if safe. Do not send passwords, tokens, or private account information.
5. Send feedback through the in-app feedback action or the agreed private contact method.
6. Try the task again on another day if it was useful to you. Do not force daily use just for the pilot.
7. You may stop at any time. You do not need to write a public review.

## 6. Two-week schedule

### Before Day 1
- Run the target workflow on a desktop and a modest/mobile device where possible.
- Test the happy path and one expected failure/retry path.
- Record known limitations and share them plainly.
- Define activation, completion, return-use and issue-severity rules before looking at results.
- Explain what feedback will be recorded and who can see it.

### Days 1–3: first use
- Invite participants to try the target task once.
- Record eligible participants, task starts, valid completions, and critical failures.
- Ask the short first-use questions below.
- Fix any critical blocker before inviting more participants.

### Days 4–7: observe friction
- Let participants use the tool naturally; do not chase them daily.
- Group feedback by issue type and affected workflow.
- Respond to reports when possible, but do not promise a fix date.
- At the end of Week 1, ask whether they chose to use it again and why.

### Days 8–13: repeat use
- Ask participants to try the workflow again only if it remains relevant to their studies.
- Check whether they return without repeated reminders.
- Record recurring failures, workarounds, and features they chose not to use.

### Day 14: exit review
- Ask the exit questions below.
- Summarize negative, mixed and positive evidence.
- Decide whether to fix, narrow, repeat, or expand the pilot.
- Only invite an honest public review if a participant has enough experience to form an opinion, and make clear that no review is required.

## 7. Short feedback questions

Ask after a meaningful attempt, not after every click:

1. What were you trying to do?
2. Did you finish the task? **Yes / Partly / No**
3. What helped most, if anything?
4. Where did you get stuck?
5. Did anything look incorrect, confusing, slow, or unreliable?
6. What did you use instead when Shadecode Student did not help?
7. What is the one change that would make this workflow more useful?

Optional rating: **How useful was this attempt? 1–5 / Not sure**. Treat this as self-reported experience, not proof of learning.

## 8. Week 1 and exit questions

At the end of Week 1:
- Did you choose to use the workflow again? Why or why not?
- Was anything unreliable enough to make you stop?
- What did you use the product for that you would not otherwise have done?

At the end of Week 2:
- Did you return without someone reminding you? **Yes / No**
- Would you keep using this workflow for your studies? **Yes / Maybe / No**
- What is the main reason for that answer?
- What did the product do poorly?
- What should we fix before inviting more students?
- Would you recommend it to a classmate? Why or why not? (No pressure to recommend.)

## 9. Pilot tracking sheet

Use aggregate counts where possible. Avoid collecting extra personal details.

| Metric | Definition to set before Day 1 | Result |
|---|---|---|
| Invited | Number of students personally invited with permission | |
| Opted in | Number who voluntarily joined | |
| Activated | Joined participants who attempted the target task at least once | |
| First-task completion | Participants who completed the task / participants who attempted it | |
| Critical failure count | Failures that block completion or risk data loss | |
| Repeat users | Participants who returned on a later day by choice | |
| Recurring issue classes | Issue types reported by more than one participant | |
| Useful feedback items | Reports that produce a reproducible issue, unmet need, or actionable insight | |
| Continued-use intent | Yes / Maybe / No counts from exit question | |
| Referral activation | Referred people who actually complete the target task, if referrals occur naturally | |

Record numerator, denominator, time window, and known blind spots. A tiny cohort is for discovering problems, not proving statistical significance or causal learning gains.

## 10. Issue triage log

| Date | Workflow | Issue class | Reproducible? | Severity | Workaround | Next action | Status |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

Suggested severity:
- **Critical:** data/privacy risk, lost work, or a blocker preventing the target task.
- **High:** common failure with no reasonable workaround.
- **Medium:** friction or inconsistent behavior with a workaround.
- **Low:** polish or a rare edge case.

Do not put secrets or unnecessary student identifiers in this log.

## 11. Decision after Day 14

- **Pause:** any unresolved privacy/security risk or repeated critical failure.
- **Fix before scaling:** users start but cannot reliably finish the target task.
- **Narrow:** evidence suggests the workflow helps one segment but not others.
- **Repeat:** evidence is mixed or the sample is too small to interpret.
- **Expand cautiously:** target-task completion and voluntary repeat use are credible, major failure classes are understood, and the next cohort can be supported.

A few positive comments are not enough to claim learning improvement or product-market fit. Publish no success claim without a clear denominator, time window, and permission where individual stories are involved.

## 12. Honest review invitation

Only after a participant has enough real experience, and only if appropriate:

> Thanks for taking part in the pilot. Your honest feedback has helped us understand what works and what needs improvement. If you've used Shadecode Student enough to form your own opinion, you're welcome to leave an honest public review. Positive, mixed, negative, or no review are all completely okay. There's no reward or expectation attached.

Never ask only satisfied participants to review, suppress criticism, edit quotes to imply stronger results, or make public claims from a tiny uncontrolled pilot.
