# Shared Learning Artifacts

## Product rule

Cortex should look for a suitable, already-verified artifact before calling an AI provider. Generate only when a safe, sufficiently relevant reusable artifact is not available. A successful generic artifact can then become a shared resource for future learners.

This is a reuse layer, not a replacement for subject authorization, curriculum grounding, or quality checks.

## Generic artifact contract

The \`shared_learning_artifacts\` table is intentionally typed by \`artifact_type\` rather than tied to lessons. Future supported types can include course outlines, practice sets, explanations, summaries, flashcards, worked examples, and study plans. Each type must define its own schema/version and quality gate before being enabled.

Cache identity includes artifact type, normalized subject, normalized topic/request, difficulty, level, exam board, goal, and content version. A hit must not cross subjects or silently cross qualification/board boundaries. Version changes naturally invalidate older cache keys.

## Current first integration

Lesson generation checks the shared cache at the start of a new cloud generation run. If there is no exact cache hit, it may reuse an explicitly published public lesson-library entry when subject/topic coverage and the full lesson-quality gate pass. Legacy library entries are not reused when exam-board or level alignment cannot be established. Private learner lesson rows are never treated as shared content. A hit still goes through the ordinary authenticated save/finalization path for the requesting learner. It avoids the model call, not ownership, persistence, or XP accounting.

Only lessons with a high quality score and no learner-memory context are eligible for publication. Obvious personal prompts, email addresses, phone numbers, and known personal-memory phrases are rejected. These checks are defense in depth, not a claim that arbitrary text can be perfectly anonymized.

## Privacy and trust

- Never store user IDs, learner profiles, private notes, chat history, scores, answers, mastery state, or private memory in shared artifact payloads.
- Never let authenticated clients read or write the cache directly. Access is through server-owned routes using the Supabase service role.
- A generated artifact is not automatically trusted just because it exists. Validate schema, subject, request fit, quality score, and artifact version before reuse.
- A cache outage or missing migration is a cache miss, never a lesson-generation failure.
- Do not cache personalized outputs. Keep personal memory in the learner's private context layer.
- Avoid duplicate generation with a later in-flight deduplication/lease layer; the first version handles completed reusable artifacts, not concurrent identical requests.
- Track cache hit rate, provider calls avoided, quality feedback, and stale-content reports. Add review/quarantine and invalidation tools before broadening cache writes.

## Rollout

1. Apply the migration in an approved environment.
2. Deploy the server-side lesson cache integration.
3. Verify exact-hit reuse, cache miss fallback, cross-subject/board isolation, quality rejection, private-memory exclusion, and save/reopen behavior.
4. Expand to other artifact types only when each has a server-owned validator and privacy contract.
