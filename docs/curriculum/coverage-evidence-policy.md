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

## Recommendation (not implemented)
The four dimensions concern *exam history*, not what the syllabus asks students to learn. Consider splitting the gate:
syllabus-grounded teaching needs identity, objectives and the knowledge layer; **exam-specific claims** additionally need
these four dimensions. Today all four block everything (`missingCoverageDimensions` in `resolver.ts`). That changes the
fail-closed contract, so it needs an explicit product decision and resolver tests; it is deliberately not done here.
