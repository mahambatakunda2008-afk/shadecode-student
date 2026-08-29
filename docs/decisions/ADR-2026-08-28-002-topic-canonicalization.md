# ADR-2026-08-28-002: Topic Canonicalization for the Knowledge/Mastery Graph

**Status:** Proposed — needs a product decision, not an engineering one.
**Author:** Claude (Chief Software Engineer)
**Context for this doc:** Investigated on 2026-08-25 (see `.cortex/tasks.md`'s
"Student Knowledge & Mastery Graph" item) as the blocker on wiring real
prerequisite/related-topic edges into `src/lib/mastery/graph.ts`'s
`buildKnowledgeGraph()`. Written up properly here because it's a real fork with
lasting consequences, not a one-line fix.

## The problem, precisely

Two systems in this codebase talk about "topics" and don't agree on what a topic is:

1. **The curriculum catalog** (`src/lib/curriculum/cambridge.ts` and siblings) has
   real, structured topics with stable IDs — `cambridge-math-2`, title
   `"Algebra and Graphs"` — and, for one subject so far (Cambridge Mathematics
   IGCSE, 8 topics), real `prerequisites: string[]` data pointing at other topic
   IDs in the same catalog.
2. **`topic_mastery`** (the table that actually tracks what a student knows) has a
   `topic` column that is free text. Traced to its source: `StudySpace`'s
   `evidenceFromWork()` (`src/lib/studyspace/evidence.ts`) reads `work.topic`
   straight off whatever the student or an AI generation step wrote when the
   session/work object was created — not validated or matched against the
   curriculum catalog at any point.

`src/lib/mastery/graph.ts`'s `buildKnowledgeGraph()` and `rankNextTopics()` are
real, well-built, and already correctly wired to real `topic_mastery` evidence
(mastery score, attempt count, recency — fixed 2026-08-25). But they've never had
real edges, because there's no reliable way today to know that a `topic_mastery`
row with `topic: "quadratics"` refers to the same thing as catalog topic
`cambridge-math-2` (`"Algebra and Graphs"`, subtopic `"Quadratic Graphs"`), let
alone to do that reliably across every subject, board, and however students or the
AI happen to phrase a topic name.

Practical stakes: without this, the "prerequisite pressure" term in
`rankNextTopics()`'s scoring is permanently zero — the graph knows *how well* a
student knows something, but never *what they need to know first*. That's most of
the actual value of a knowledge graph over a flat mastery table.

## Why this isn't a quick fix, and why a shortcut is actively worse than doing
## nothing

The obvious shortcut — fuzzy-match `topic_mastery.topic` strings against catalog
topic titles (substring match, embedding similarity, an LLM call) — was
deliberately not attempted. Reasoning:

- A wrong match doesn't fail loudly. It silently tells a student "you should
  master X before Y" when that's not actually true for the curriculum they're on.
  That's a worse failure mode than the current one (no prerequisite advice at
  all), and it's exactly the kind of fabricated-confidence problem this codebase's
  own history has repeatedly had to catch and fix (see `DEVLOG.md`'s several
  fabricated-content precedents, and the placeholder-question fix documented in
  `BLUEPRINT_GAP_MATRIX.md`).
- It would also only ever cover the one subject (Cambridge Math IGCSE) that has
  real prerequisite data today. Every other subject would still get zero
  prerequisite signal, just with the illusion of the feature "working" for one
  narrow case.

## Two real options

### Option A — Canonicalize at capture time
Constrain `WorkObject.topic` (and therefore everything downstream: StudySpace
evidence, `topic_mastery`, the knowledge graph) to always be a real curriculum
catalog topic ID, chosen from a real list at the point a student starts a session
— not free text.

- **Pros:** Every future `topic_mastery` row is trustworthy by construction. No
  matching layer needed, ever. Makes the eventual mastery graph fully reliable,
  not just "reliable for one subject."
  **Cons:** Requires the curriculum catalog to actually cover every subject/board
  a student might study before StudySpace can let them log work in it — today
  that's one subject. Changes StudySpace's UX (topic becomes a pick, not free
  text) and touches onboarding/session-creation flows, not just the mastery
  module. `topic_mastery` currently has zero production rows, so there's no
  migration cost for existing data — but this needs both database-level scoping
  (probably a `topic_id` foreign key alongside or instead of the free-text
  `topic` column) and a real curriculum-authoring effort to get catalog coverage
  beyond one subject.

### Option B — Best-effort normalization at read time
Keep capture free-form (StudySpace stays flexible, no UX change), and build a
matching layer — deterministic first (exact/near-exact string match against
catalog titles and known aliases), with any fuzzier matching treated as a
low-confidence signal that's surfaced, not silently trusted (e.g. the graph could
carry a `matchConfidence` per edge and `rankNextTopics()` could down-weight or
ignore low-confidence edges rather than act on them as if certain).

- **Pros:** No UX change, no dependency on curriculum-catalog coverage expanding
  first, ships incrementally per subject as catalog data grows.
  **Cons:** Permanently a probabilistic system with a real, non-zero
  misattribution rate no matter how it's tuned — the two match badly for a
  learning product where a wrong "study X before Y" claim actively wastes a
  student's limited time before an exam. Ongoing maintenance burden as new
  phrasings appear. Only as good as the matching heuristic, forever.

## Recommendation

Lean Option A, gated on curriculum catalog coverage — but this is stated as a
lean, not a decision, because it trades an engineering cost (catalog authoring,
several subjects' worth) for a product cost (constraining what feels like a
flexible, "type anything" StudySpace flow into a pick-from-list one, at least for
the topic field specifically). That tradeoff is the founder's call, not
engineering's — hence this document instead of a merged PR.

If Option A: unblocks by expanding curriculum catalog coverage past the one
Cambridge Mathematics IGCSE subject that has it today, which is itself a
real body of work (accurate topic lists per subject per board, with real
prerequisite relationships — not just topic names) — closely related to, maybe the
same effort as, the "Assessment Intelligence & Past-Paper Intelligence" 🔴
strategic item already on the board in `.cortex/tasks.md`.

If Option B: build the confidence-scored matching layer described above,
starting with the one subject that already has real prerequisite data, as a
narrow, honestly-labeled pilot rather than a general solution.

## Not decided here

This document intentionally stops at laying out the fork rather than picking a
side and implementing it — per this project's own engineering discipline
(`docs/AGENT_COORDINATION_PROTOCOL.md` §18, "creative only within existing system
constraints"; `.cortex/tasks.md`'s repeated emphasis on not building parallel or
speculative systems), a decision with this much product-UX and multi-week-effort
weight belongs with Takunda.
