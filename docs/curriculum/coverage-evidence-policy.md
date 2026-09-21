# Decision: what counts as evidence for the four assessment-history coverage dimensions

Decided 2026-09-20 (owner delegated the call: "do what's best").

The dimensions are `past_paper_coverage`, `mark_scheme_coverage`, `examiner_report_coverage` and
`grade_threshold_coverage`. The syllabus PDF cannot evidence them.

## Policy
1. **Each dimension is satisfied only by evidence of that artifact type.** No substitution.
2. **Specimen papers and specimen mark schemes** (published with the syllabus) may be recorded as `draft` evidence for
   `past_paper_coverage` and `mark_scheme_coverage` respectively, and **never `verified`**. They show the question
   style; they are not past exam series.
3. **`examiner_report_coverage` and `grade_threshold_coverage` cannot be satisfied by specimen material.** They are
   `not_applicable` only when the exam board demonstrably has not yet published any for that syllabus (no exam series
   has been sat); otherwise they stay `missing` until the real report or threshold document is read and cited.
4. `verified` evidence must cite the exact document and page, like every other dimension, and be re-checked when the
   syllabus version changes.

## Why
The resolver is fail-closed on purpose: a `verified` mark tells the AI it may make exam-specific claims (typical
question styles, mark-scheme conventions, grade boundaries). Accepting specimen material as the real thing would let it
state things about past exams that we never read.

## Implemented: two-tier gate (2026-09-20)
The four dimensions concern *exam history*, not what the syllabus asks students to learn, yet each blocked every
consumer. `CurriculumGateTier` (`completeness.ts`, `resolver.ts`) now separates them:

| Tier | Requires | Used by |
|---|---|---|
| `"exam"` (**default**) | all 29 coverage dimensions | anything not opted in, `verification.ts` "production complete" reporting, future Past Papers / Exam Sim |
| `"syllabus"` | the 25 syllabus dimensions (everything except the four exam-history ones) | Learn lesson generation (`ai-grounding.ts`) and Cortex (`user-resolution.ts`) |

Everything else in the gate is identical in both tiers (identity, a verified and currently effective version, verified
objectives, verified knowledge covering all 15 kinds). Each resolution reports `tier`, `examHistoryVerified` and
`examHistoryMissing`. When `examHistoryVerified` is **false**, the system prompt gains an explicit rule forbidding
citations of specific past papers, question numbers, mark-scheme wording, examiner comments, grade boundaries or pass
rates, and telling the model to describe assessment only from verified syllabus knowledge. Contexts that do not assert the
flag produce exactly the same prompt as before. Computer Science 0478 (29/29) is unaffected. No learner currently has a
stored identity, so nothing changes for users until identities are stored. `gate-tiers.test.ts` and
`user-resolution.test.ts` pin the behavior, including that any single missing syllabus dimension still blocks.
