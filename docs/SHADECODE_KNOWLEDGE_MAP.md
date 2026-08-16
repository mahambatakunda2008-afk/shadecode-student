# Shadecode Knowledge Map

This map tells agents where project truth is recorded. It is intentionally a map, not a replacement for the underlying documents.

## Strategic Layer

| Area | Primary location | Purpose |
|---|---|---|
| Product vision | Blueprint volumes / approved project documents | Long-range direction |
| Architecture | `docs/ARCHITECTURE.md` + approved blueprints | System structure and boundaries |
| Blueprint gaps | `docs/BLUEPRINT_GAP_MATRIX.md` | Missing, incomplete, or unresolved blueprint material |
| Breakthroughs & pivots | `docs/SHADECODE_BREAKTHROUGHS_AND_PIVOTS.md` | Strategic breakthroughs, research directions and fallback product paths |
| Learning intelligence | `docs/LEARNING_INTELLIGENCE_ARCHITECTURE.md` | Personal learning model, knowledge graph, assessment intelligence and personalization |
| Cortex evaluation | `docs/CORTEX_EVALUATION_ARCHITECTURE.md` | Evidence-driven autonomous improvement and promotion gates |
| Research Lab | `docs/CORTEX_RESEARCH_LAB.md` | Experimental AI/edge/agent research protocol |
| Pivot decisions | `docs/PIVOT_DECISION_FRAMEWORK.md` | Evidence-based continue/focus/pivot criteria |
| Audits | `docs/*AUDIT*.md`, latest dated audit | Evidence about the current system |
| Product decisions | Repository decision records / issues / approved PRs | Explicit decisions that override assumptions |

## Implementation Layer

| Area | Primary location | Purpose |
|---|---|---|
| Current product | `src/` | Actual application implementation |
| Database | `supabase/migrations/` + Supabase project | Schema and database behavior |
| Cortex | `.cortex/` and `src/lib/cortex/` | Autonomous intelligence and learning logic |
| Task roadmap | `.cortex/tasks.md` | Ordered implementation work |
| Dev history | `DEVLOG.md` and relevant docs | Record of changes and rationale |
| CI | `.github/workflows/` | Automated verification and automation |

## Coordination Layer

| Area | Primary location | Purpose |
|---|---|---|
| Multi-agent rules | `docs/AGENT_COORDINATION_PROTOCOL.md` | Rules shared by ChatGPT, Claude, Copilot, Cortex and future agents |
| Handoff schema | `docs/AGENT_HANDOFF_TEMPLATE.md` | Standard format for transferring work |
| Live handoff | `.cortex/agent-handoff.md` | Current ownership and exact continuation state |
| Prompts | Project prompt registry / documented prompt files | Reusable agent instructions |

## Experimental Layer

Lab/prototype work must be explicitly marked as experimental. Experimental files, branches, or documents must not be treated as production architecture until approved and recorded.

## Reading Strategy

### For a bug fix

README → relevant audit → architecture → task/issue → affected code → tests → PR history.

### For a new feature

README → relevant blueprint → blueprint gap material → architecture → roadmap/task → affected code → tests.

### For architecture work

Breakthrough/learning-intelligence documents → blueprints → audits → architecture → current implementation → dependencies → decision record.

### For prompt/agent work

Coordination protocol → Cortex evaluation architecture → relevant blueprint/docs → current Cortex/agent implementation → prompt registry → handoff state.

### For Lab/research work

Research question → `docs/CORTEX_RESEARCH_LAB.md` → applicable blueprint → current implementation constraints → experiment → recorded findings → explicit promotion decision.

### For pivot decisions

`docs/PIVOT_DECISION_FRAMEWORK.md` → product metrics → learning outcomes → customer evidence → technical evidence → decision record.

## Source Freshness

When multiple documents cover the same subject, prefer the most recent **approved and evidence-backed** document. Date alone does not make a document authoritative.

If a newer document conflicts with an older one, record the conflict and resolution rather than silently rewriting history.

## Missing Material

If an agent discovers an important project area with no durable documentation, it should create or propose the smallest appropriate record rather than leaving the knowledge only in chat.
