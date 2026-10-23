# Cortex Learning State: Foundation

## Status

Proposed implementation contract for the next Cortex learning-intelligence phase. This document does not claim that every capability described here is already implemented.

## Objective

Make Cortex's recommendations better by maintaining a trustworthy, evolving model of what a learner has demonstrated, what remains uncertain, and what to do next.

The objective is not to accumulate chat history. It is to convert verified learning activity into useful, explainable decisions across Shadecode Student's existing learning workflows.

## Non-negotiable constraints

- Extend the existing product and Cortex architecture. Do not create a parallel learning engine.
- Audit and reuse existing event, learner-memory, lesson, exam-attempt, Math Checker, and progress records before adding tables or migrations.
- Preserve the durable lesson-generation pipeline, checkpoints, leases, local recovery, verified curriculum fallback, and quality gates.
- Never expose one student's evidence or derived learning state to another student.
- Treat student answers and assessments as evidence, not unquestionable truth. Keep provenance and uncertainty.
- A provider outage must not erase evidence or block deterministic state updates.
- Recommendations must be explainable and must not silently change curriculum access or subject eligibility.
- Do not use opaque AI judgments as the sole authority for marks, access control, mastery transitions, or persistence.
- Keep privacy and data minimization central: store only learning-relevant information with an explicit purpose and retention policy.

## Vocabulary

Keep four layers distinct in code and documentation:

1. **Interaction cache**: short-lived request/response cache used to reduce latency or repeated model calls. It is not a learner profile.
2. **Learning evidence**: an append-only or otherwise auditable record of an observed event, such as an answer attempt, hint use, completed lesson, or verified assessment result.
3. **Learner state**: a derived, revisable estimate based on evidence, including skill estimates, uncertainty, likely misconceptions, and review needs.
4. **Curriculum knowledge**: authoritative subject/topic/skill metadata and prerequisite relationships. It must not be inferred solely from generated lesson titles.

Do not use the unqualified term “memory” where one of these precise terms is meant.

## Evidence contract

Where the existing schema permits, a learning-evidence item should identify:

- learner ID, enforced server-side from the authenticated session
- event ID or idempotency key
- event type and schema version
- timestamp
- source module and source record ID
- curriculum identifiers: subject, topic, skill, and question/lesson when available
- outcome and scoring provenance
- difficulty or assessment context when known
- assistance context, such as hint use or worked-solution exposure
- evidence quality/confidence and any reason it may be incomplete
- minimal metadata needed to reproduce or audit the derived decision

Do not copy full chat transcripts or sensitive free-text into the learner state when a compact, typed signal is sufficient. Preserve raw source records according to their existing access and retention rules; link to them rather than duplicating them unnecessarily.

## Learner-state contract

A state record or computed view should be able to represent, where evidence supports it:

- current estimated proficiency per skill
- confidence/uncertainty in that estimate
- evidence count and recency
- demonstrated independent performance versus assisted performance
- recurring error categories and their supporting examples
- prerequisite gaps
- review/retention risk, explicitly labeled as an estimate
- the most recent evidence that changed the estimate
- model/algorithm version used to derive the estimate

A state must be allowed to say **unknown / insufficient evidence**. Do not manufacture a mastery score from a topic name, lesson completion alone, time spent, or a single correct answer.

## Recommendation contract

Each recommendation should carry a compact, inspectable reason:

- target skill or learning goal
- selected action and destination module
- evidence that triggered it
- why the action fits the current state
- prerequisite and curriculum checks passed
- confidence or uncertainty where relevant
- expected completion signal used to evaluate whether the action helped

Start with deterministic ranking rules using verified evidence. Do not introduce a learned ranking model until the evidence quality and outcome metrics are adequate.

Candidate ranking signals, subject to product rules, include:
1. explicit student goal or imminent assessment
2. verified prerequisite blockers
3. repeated error patterns
4. low independent accuracy supported by enough evidence
5. review due based on time and prior performance
6. variety and avoidance of repeatedly recommending an action that did not help

Do not optimize for engagement or session length at the expense of learning.

## Example

A learner correctly differentiates simple polynomials but repeatedly fails chain-rule questions in applied contexts.

Cortex should keep these as separate skill signals. It should not label all differentiation as weak. It can recommend a short applied chain-rule exercise, record whether the learner solves it independently, and adjust the estimate from the new evidence.

If there are too few attempts to identify the cause, Cortex should gather diagnostic evidence instead of asserting a misconception.

## Cross-module integration

The goal is one coherent learner model, not duplicated per-feature scores.

- **Learn**: lesson start/completion and skill-linked checks; completion alone is weak evidence of mastery.
- **Exam Sim**: item-level outcomes where reliably available, preserving paper/question provenance and marking confidence.
- **Math Checker**: distinguish a final answer check from a full solution or AI-generated worked solution; do not treat viewing a solution as independent mastery.
- **Revision and practice**: capture skill-linked results and assistance context.
- **Focus/timetable**: use learning state to prioritize work only when relevant; schedule completion is not proof of learning.

Integrate one source at a time after auditing its current schema and event semantics. Missing skill IDs must remain missing until curriculum mapping is verified.

## Reliability and correctness requirements

- **Idempotency**: retries of the same source event must not inflate evidence counts.
- **Ordering**: delayed events must not blindly overwrite newer state. Recompute or reconcile from ordered evidence as appropriate.
- **Atomicity**: persist source evidence before or atomically with derived state updates when the existing storage model permits.
- **Recoverability**: if derived-state computation fails, preserve the source event and allow safe recomputation.
- **Tenant isolation**: derive learner identity server-side and enforce row-level security.
- **Versioning**: version event schemas and derivation algorithms so estimates can be rebuilt after logic changes.
- **Explainability**: every recommendation must be traceable to evidence and deterministic rules.
- **Graceful degradation**: learner-state failure must not break lesson generation, exam submission, or other core tasks.
- **No false certainty**: incomplete, assisted, or low-quality evidence must not be represented as verified mastery.

## Implementation sequence

### Phase 0: inventory before schema changes

1. Inspect current Cortex event APIs and event tables.
2. Inspect persistent learner memory and distinguish it from the in-process Q&A cache.
3. Inspect lesson completion/check records, Exam Sim attempts and marks, Math Checker outcomes, and current progress/XP logic.
4. Document event identity, learner ownership, RLS policies, and available skill/topic IDs.
5. Identify duplicate representations and choose canonical source records.

Deliverable: a field-by-field reuse map. Do not create a new generic events table merely because its name looks convenient.

### Phase 1: normalized evidence adapter

- Build a typed adapter over the existing canonical records/events.
- Add source-specific adapters incrementally.
- Test learner isolation, idempotency, missing curriculum mappings, retries, and partial failures.
- Avoid duplicating sensitive source payloads.

### Phase 2: deterministic learner-state derivation

- Compute skill estimates only from validated evidence.
- Preserve uncertainty and provenance.
- Make recomputation deterministic and versioned.
- Keep the first implementation rule-based and easy to inspect.

### Phase 3: next-action selection

- Add an explainable recommendation function with curriculum and subject eligibility checks.
- Ensure the function can return “not enough evidence” and a diagnostic activity.
- Record recommendation outcome so usefulness can be measured.

### Phase 4: controlled cross-module rollout

- Begin with one well-instrumented workflow.
- Compare derived recommendations with actual subsequent independent performance.
- Expand to other modules only after correctness, reliability, and privacy tests pass.

## Required tests

- A duplicated event does not count twice.
- A late event does not corrupt a newer learner state.
- A failed derivation does not lose source evidence.
- An unauthenticated or mismatched learner cannot read or write another learner's state.
- A correct answer after revealing the solution is not classified as independent mastery.
- A completed lesson without an assessment does not automatically produce mastery.
- An unmapped question does not get assigned to a skill by title guessing.
- Provider failure does not block deterministic state updates.
- A recommendation includes a human-readable evidence-based reason.
- Existing lesson generation, exam submission, and core progress flows continue to work if the learning-state service is unavailable.

## Success measures

Measure learning outcomes and system reliability, not just clicks:

- change in independent accuracy on the targeted skill
- retention on a delayed check
- reduction in repeated error categories
- transfer to unfamiliar but curriculum-aligned questions
- recommendation acceptance and completion, interpreted as diagnostic metrics rather than learning outcomes
- state freshness, duplicate-event rate, recomputation failures, and cross-learner isolation test results

Do not claim the system improves learning until controlled product evidence supports that claim.

## Definition of done

The foundation is ready when existing records can be mapped to a canonical evidence contract, a deterministic state can be safely derived and explained, retries are idempotent, learner isolation is tested, and one student workflow shows a measurable benefit without compromising the current product's reliability.
