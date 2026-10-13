# Generation Resilience Standard

Status: adopted 2026-10-09. Applies to every feature that produces content for a student
(exams, quizzes, lessons, notes, flashcards, plans, tutoring, feedback).

## Why

Over 7 days in production, 0 of 29 AI provider calls succeeded (Gemini 503 and timeouts, OpenRouter
free-tier timeouts, Cloudflare empty responses). Free-tier providers are unreliable and some are
unreachable for us. A student must never be blocked, shown fabricated content, or made to wait on a
provider that is down. Models are an optional enhancer, never a requirement.

## The ladder

Every generation request resolves through these tiers in order and stops at the first that serves.

| Tier | What | Properties |
| --- | --- | --- |
| L0 | Verified library / cache of previously generated and validated content | instant, free, offline-capable |
| L1 | Deterministic engines (`src/lib/exam/engine`) | computed answers, exact marking, seeded, offline |
| L2 | Grounded synthesis from verified curriculum (`src/lib/study/revisionDeck.ts`) | official outcomes only, no invention |
| L3 | AI generation (shared chain, per-provider breakers, hard budgets) | best effort, validated, never required |
| L4 | Honest degradation | fast, retryable, "nothing was lost", never a placeholder |

## The learning loop (our own engine)

We are not training a language model: that needs GPUs, huge data and money, and would still lose to the
providers. Instead the platform learns from everything learners do, and uses models only as an optional
content producer whose output is validated.

1. **Capture.** `learning_signals` records every question outcome (generator id, correct, diagnosed
   mistake, time) from exams, battles, engine practice and revision decks. Fire-and-forget; RLS insert/select own.
2. **Diagnose.** `src/lib/exam/engine/mistakes.ts` knows each question type's classic wrong answers, so a wrong
   answer gets a specific hint instead of "incorrect". The mistake id is recorded.
3. **Learn per learner.** `src/lib/learning/adaptive.ts` weights question types by the learner's own error rate;
   practice serves more of what they get wrong and less of what they have mastered.
4. **Learn across learners.** `learning_item_stats` and `learning_mistake_stats` (service role only) show which
   question types are hard or broken and which mistakes are most common. Use them to tune generators and to
   decide which mistakes deserve a written explanation.

Planned: a library of lessons (`learn_lessons`, keyed to curriculum objectives) ranked by learner outcomes and
searchable with BM25 so "Ask" works with no model; spaced-repetition daily missions from keyed mastery;
difficulty calibration from the stats.

## Rules

1. Never serve fabricated or generic placeholder content. If no tier can serve, say so (L4).
2. Label degraded results (for example `ExamSourceNotice`) so the student knows what they have.
3. Fail fast: a dead provider must cost nothing (breakers), and a request must never hang past its budget.
4. A student's write (answers, mastery, progress) must never depend on AI.
5. Validate model output before use. Prefer deterministic marking wherever the answer can be computed.
6. Anything scored or shared is decided on the server against a key the browser never holds.
7. Silent failures are bugs: if a non-fatal insert can be rejected by a constraint, test the constraint.
8. Tests: every deterministic generator is verified against an independent recomputation.

## Status by feature (2026-10-09)

| Feature | Tiers available | Gap |
| --- | --- | --- |
| Exam (Maths, Physics, Chemistry, Computer Science) | L1, L3, L4 (+ curated bank) | no L0 cache; no mixed engine+AI papers |
| Exam (Biology and other subjects) | L3, curated bank, L4 | needs L2 self-check or a verified L0 library |
| Lesson quiz | L1 (covered topics), L3, L4 | L2 for uncovered topics |
| Revise by syllabus (flashcard-style decks) | L2 only (no model) | content is outcome prompts, not definitions |
| Lessons | Cortex local packs + L3 | audit coverage of local packs |
| Paper learning (plan, evaluate, transfer) | L3; L2 self-check plan and checkpoints; L1 engine practice question per matched topic | self-check matching unvalidated on real papers; Biology and uncovered topics have no practice question; AI-only actions (explain, why, quiz-me, transfer) are hidden in self-check sessions, so there is no model-free teaching text |
| AI tutor | L3 plus its own fallbacks | audit |
| Battle marking | L1 server-marked; written papers self-reported | verify challenger score |
| Tutor 'Ask' / lesson search | L0 library search (BM25, learns from votes), 23 lessons | tiny corpus; not yet used as the generation fallback; lessons unmatched to syllabus subsections |
| Learning loop | capture (exams, battles, practice, decks), mistake diagnosis, learner-adaptive practice | nothing yet reads `learning_item_stats`; no admin view; only ~19 active learners, so cross-learner statistics are thin |

## Checklist for a new generating feature

- [ ] Which tiers can serve it? At least one must not need a model.
- [ ] What does the student see when only L4 is left? Is it retryable and honest?
- [ ] Is anything scored, shared or persisted protected from forged or failed AI?
- [ ] Are non-fatal writes checked against real constraints (CHECK, NOT NULL, integer columns)?
- [ ] Which tier served the request, and can we see that in telemetry?

## Owner actions that need access we do not have

- Provider keys: add any reachable low-latency provider to the chain (Groq is not usable for us).
  A paid, reliable key (for example Anthropic) is the dependable last resort.
- `SUPABASE_SERVICE_ROLE_KEY` must be present in production for server-marked battles.
