# System-wide student agency and learning evidence contract

**Date:** 2026-10-19  
**Status:** Shared components and core-surface integrations implemented on the feature branch; validation pending.

## Product rule

Shadecode Student must let students choose the kind of help that fits the moment, while showing only the progress evidence the product actually has. Guided reasoning is a useful default, not a gate that students must pass before receiving an answer.

This contract applies to the personal academic operating system as a whole. It must not be implemented as five separate, inconsistent tutoring philosophies.

## Shared implementation

- `src/lib/learning/helpActions.ts` defines the canonical help actions and the request prompt/level for each action.
- `src/components/learning/LearningHelpActions.tsx` renders the shared keyboard-accessible controls.
- `src/components/learning/LearningEvidenceTrace.tsx` renders evidence summaries without turning activity into mastery claims.
- `src/lib/learning/helpActions.test.ts` covers the shared action inventory and question/feedback context preservation.

## Surface coverage

| Surface | Student agency | Evidence shown | Guardrail |
|---|---|---|---|
| Learn lesson page | Opens the existing guided tutor; tutor offers the shared help actions | Saved lesson progress and explicit completion state | Reading progress is not mastery |
| Socratic Tutor / Cortex tutoring | Clearer hint, more detail, another method, explanation of why, worked solution plus independent practice | Student contributions versus an unverified independent check | Do not count help-button clicks as attempts; don't force repeated questions after a direct request |
| Cortex Verify / Math Checker | Reuses the shared controls to request another kind of help for the same problem and existing feedback | This submission's verdict and estimated score | The result applies to submitted work only; preserve local/cloud/offline queue behavior |
| Exam Sim | After the paper is marked, students can request a clearer hint, more detail, another method, explanation, or worked solution on a missed question | Paper score and weak-area count | A paper score is evidence from one assessment, not global subject mastery; do not expose answer help during the timed paper |
| Exam Hub / Past Papers | Question Bank now uses the shared controls and forwards requested help style to Cortex | Source/provenance, answer attempts, marking and review evidence | Do not fabricate official answers or claim generated practice is an official past paper |
| Challenges and quizzes | Must emit canonical answer/assessment evidence, not conversation activity | Correctness and transfer where verified | Challenge outcomes are not subject mastery |
| Cortex, study planning, dashboard and insights | Reuse the same action IDs and evidence vocabulary as those workflows are touched | Canonical learning signals, recency and uncertainty | Do not create a second mastery ledger or infer learning from feature usage |
| Offline/PWA and mobile | Controls must preserve drafts and queued work, then recover on reconnect | Distinguish local-only, queued and server-saved records | Never show a cloud save or completed result unless confirmed |

## Evidence vocabulary

Keep these signals separate:

1. **Activity:** prompt sent, help action chosen, lesson opened, or section viewed.
2. **Attempt:** student supplied an answer or working.
3. **Assessment:** answer was checked/marked against a defined task.
4. **Independent transfer:** student solves a similar item without tutor help.
5. **Mastery estimate:** a modelled estimate derived from multiple valid observations, with uncertainty and recency.

A lower-level signal cannot silently substitute for a higher-level one. In particular:
- chat turns and help-button clicks are not attempts;
- a lesson marked complete is not proof of understanding;
- one paper score is not overall subject mastery;
- an AI confidence score is not a calibrated probability unless calibration has been verified.

## Acceptance gates

- [ ] Typecheck, lint, focused tests, full tests and production build pass on the exact final commit.
- [ ] All five help actions work in the Tutor, Cortex Verify and post-exam review, with the original question and relevant feedback preserved.
- [ ] The active timed exam does not reveal worked answers before submission.
- [ ] A forced failure preserves the original draft and leaves retry state usable; no duplicate result is stored.
- [ ] Learn completion, quiz/transfer outcomes and Exam Sim marking produce distinguishable evidence.
- [ ] Local-only, queued and server-saved states remain distinct through offline/online transitions.
- [ ] Narrow mobile, keyboard-only navigation and screen-reader labels are checked on each modified surface.
- [ ] Five students are observed without explaining the intended design; report friction and contradictory cases, not just positive reactions.
- [ ] Real learning outcomes are evaluated with independent follow-up items before any grade-improvement claim.

## Research and product discipline

Direct-answer requests have multiple causes: confusion, time pressure, prior knowledge, task importance, or preference. Do not assume all are resistance to learning. Use the selected help action and the student's actual work to adapt the next response.

The first five usability sessions are formative. They can expose friction, but they cannot establish market demand or prove that grades improved. Keep public claims focused on what is verified: useful practice, feedback and a clearer view of what needs another attempt.
