# Why no learner can reach curriculum-aware teaching today (found 2026-09-20)

Objective-first curriculum resolves from `profiles.curriculum_subjects`, an array of canonical identities
`{ boardId, qualificationId, level, subjectId, syllabusId?, syllabusVersion?, subjectName? }`
(`normalizeStoredCurriculumIdentity` needs only board, qualification, level and subject; syllabus and version are
catalog outputs the system finds itself).

**Measured in production (62 profiles): `curriculum_subjects` is empty for all of them.**

## Cause
`buildExactCurriculumSubjects` in `src/lib/onboarding/mapFormData.ts` only emits an identity when the *student*
supplies a qualification, a **syllabus version** and a **syllabus code per subject**; otherwise it returns `[]`.
That is stricter than the resolver (which treats syllabus and version as system-resolved) and conflicts with the
objective-first contract ("never manual learner inputs"). Learners who did pick a board and level (for example Cambridge
International, `as_level`, subject codes 9709/9702/9618) ended up with only the legacy `curriculum_profile` JSON, which
nothing in the resolver reads, and `qualification` / `syllabusVersion` null.

## Also noted
- The mapper slugs the level from free text; `EducationLevel` uses underscores (`as_level`, `a_level`).
  Confirm the values line up before relying on `level` equality.

## Do not "just fix the mapper" first
Relaxing the mapper would store identities for real students and switch on the fail-closed gate
("blocked when no verified objectives exist") for every subject that has no curriculum, and only Computer Science
(and now 9709 at the objective layer) has any. Order of work: **content and knowledge first, identity plumbing after**,
and decide what a blocked learner sees (fall back to generic teaching versus a blocking message) before flipping it on.
