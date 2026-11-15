# Shadecode Student: evidence-first product walkthrough

**Prepared:** 2026-10-23  
**Status:** Recording script and acceptance checklist only. No recording has been made and no steps are claimed to have passed.

## Purpose

Show a real learner task from beginning to end, not an architecture pitch. The walkthrough should answer: “What can a student do today, what does the system save, and what should they do next?”

## Before recording

Use a dedicated test account and a verified, supported subject/topic. Do not show a real student's name, email, exam history, messages, private notes, API keys, admin screens or another user's data. Reset or seed only test data through approved test procedures. Record the application version/commit and date in the internal evidence log.

Do not record a step as successful unless it was completed in the deployed build being shown. If a critical step fails, capture the failure for engineering and postpone the polished walkthrough rather than editing around it.

## Walkthrough sequence (about 90–150 seconds)

### 1. Start with a real study goal
- Show the supported curriculum context selected for the test account.
- State the exact board, qualification, subject and topic being demonstrated.
- Do not imply that all subjects, all boards or every syllabus year are complete.

### 2. Open a lesson
- Open an existing verified lesson or generate one using the normal learner flow.
- If generated, show whether it is a cache reuse or a new generation only if the UI can truthfully establish that fact.
- Show the lesson's learning objective and one concise explanation or diagram.
- Do not describe generated content as official Cambridge/ZIMSEC content unless it has a verified official source.

### 3. Show learner thinking
- Answer a checkpoint or practice question with a plausible misconception.
- Show the actual feedback and next step.
- Check that the tool helps the learner reason instead of simply revealing the answer by default.
- Demonstrate the direct-answer option only if the current UI supports it and follow it with an independent practice check.

### 4. Verify persistence
- Complete one meaningful action.
- Navigate away and return or reload the page.
- Confirm the completed action/progress remains present and belongs to the same account.
- If the app displays pending/offline state, explain the difference between local save, queued sync and server-confirmed save. Never call a queued event “synced.”

### 5. Show the next useful action
- Open the actual progress/next-step view.
- Explain which observed evidence led to the recommendation, where the interface exposes that basis.
- If the recommendation is a heuristic or generic rule rather than validated personalization, say so.
- Do not claim mastery has improved from one answer alone.

### 6. Close with limits
- State the demonstrated scope, the features not tested, and the current product status.
- Invite the viewer to try the same workflow and report friction.
- Do not show fabricated testimonials, usage figures, scores or before/after improvements.

## Release acceptance checklist

- [ ] Clean test account can sign in and reach the selected subject.
- [ ] Topic/lesson shown matches the stated board, level and subject.
- [ ] Lesson is either a verified existing artifact or completes generation without losing partial progress.
- [ ] Checkpoint feedback is correct against a human-reviewed answer key.
- [ ] User can recover after navigating away/reloading.
- [ ] Progress belongs only to the test account and is not duplicated after retry.
- [ ] Recommendation can be traced to the evidence visible in the product, or is labelled as a generic suggestion.
- [ ] Privacy policy and Settings request links are visible and accurate.
- [ ] No credentials, personal student data or unverified provider claims appear in the recording.
- [ ] Failures and omitted capabilities are logged, not edited into a misleading success story.

## Evidence log template

- Date / commit / deployment URL:
- Test account identifier (non-personal test label only):
- Board / qualification / subject / syllabus year / topic:
- Lesson source: existing verified artifact / new generation / other:
- Steps passed:
- Steps failed and issue IDs:
- Data persistence checked:
- Cross-account isolation checked:
- Content answer key reviewed by:
- Known limitations:
- Recording consent and storage location:
- Reviewer sign-off:

## Public description after verification

Use a short description grounded in the actual recording, for example: “This walkthrough shows one supported subject workflow from lesson to practice and saved progress. It is a product demonstration, not evidence of improved exam results.” Update the wording to match the exact steps that really passed.
