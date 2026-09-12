# Quiz results never reach the dashboard — traced, not fixed (2026-09-12)

**Symptom:** the live dashboard (`DashboardReimagined.tsx`, via `student-intelligence`'s
`performanceService.getQuizPerformance()`) always shows zero quiz activity, for every
student, regardless of how many quizzes they've actually completed. This is
indistinguishable from genuine inactivity, which is the dangerous part — a student who's
done 50 quizzes sees exactly the same dashboard as one who's done none.

## The full chain, traced end to end

1. **The live quiz UI** (`src/app/(app)/learn/[lessonId]/quiz/page.tsx`) does **not**
   call any results-submission endpoint on completion. It only calls `/api/learn` (load
   lesson) and `/api/learn/quiz` (generate questions). Results are instead pushed through
   `emitLearningEvent` / `buildQuizCompletionEvidence` (`src/lib/intelligence/`) — an
   event-based path, not a direct write.
2. **`src/lib/events/EventPipeline.ts`** receives that event but has its own
   unimplemented steps: `TODO: Implement persistence to events table`,
   `TODO: Integrate with Cortex event system`, `TODO: Integrate with analytics system`.
   Whether anything durable happens with a quiz-completion event right now needs
   verifying directly — didn't confirm whether it's a no-op or partially wired.
3. **`src/lib/student-intelligence/services/performance.ts`**'s `getQuizPerformance()`
   unconditionally `return []`, with an explicit `TODO: Implement quiz results
   tracking` comment — it was never wired to read from anywhere, which is at least
   honest about the gap even though the UI doesn't reflect that honesty.
4. There's also a **second, separate, unused submission path**:
   `src/app/api/learn/quiz/submit/route.ts` (from a recent "secure Learn quiz
   submission endpoint" commit) does write real assessment data — but only via calling
   a `record_curriculum_assessment_result` Postgres RPC, and only when the lesson has a
   verified curriculum objective set attached. Given **zero curriculum versions are
   verified in production** (see `docs/curriculum/0478-verification-status.md`), this
   path always short-circuits to `{curriculumTracked: false, reason:
   "CURRICULUM_UNVERIFIED"}` and records nothing, for every lesson, right now. It also
   isn't called by the live quiz page at all — two different, disconnected submission
   mechanisms exist simultaneously.

## Why this wasn't fixed in the same session it was found

This isn't a wiring bug (two already-built pieces that just need connecting) — the
persistence layer itself doesn't exist yet (`select table_name ... like '%quiz%'`
returns zero tables in production). Properly closing this gap means: designing a real
quiz-attempts schema, deciding whether the event-pipeline path or the curriculum-gated
RPC path (or both, for different purposes) is the intended long-term architecture,
wiring the live quiz page to actually call whichever is chosen, and updating
`getQuizPerformance()` to read real data back. That's foundational, cross-cutting work
better done deliberately than folded into an unrelated session as a quick patch —
exactly the same judgment call as the curriculum-verification finding.

## Recommended immediate mitigation, independent of the full fix

Regardless of which persistence path is chosen long-term: the dashboard currently
presents "zero" with full confidence when the true state is "unknown, not tracked yet."
At minimum, `getQuizPerformance()` returning `[]` should not be silently treated as "0
quizzes taken" in the UI — that's a correctness issue on its own, separate from
whether the underlying tracking gets built this quarter or later.
