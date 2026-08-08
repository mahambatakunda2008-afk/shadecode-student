# Shadecode Blueprint Corpus Registry

## Reconciliation status

A 2026-08-07 repository record documents a reconciliation of **92 blueprint `.docx` files across 8 series**. The source corpus was structurally extracted, representative material was read in full, targeted sections were read where implementation decisions required them, and the results were cross-referenced against live repository/database state.

The canonical reconciliation is `docs/BLUEPRINT_GAP_MATRIX.md`.

## What the reconciliation means

The corpus describes a 10-year, company-scale vision. The live repository is a working single-developer MVP around Phase 0 / early Phase 1. Therefore, most unimplemented blueprint material is intentional future vision rather than unfinished work.

## Series inventory currently named by the matrix

| Series | Size | Status | Interpretation |
|---|---:|---|---|
| SC STUDENT EVOLUTION | 22 volumes | Substantial / active | Closest to current product; living guidance. |
| ENGINEERING BLUEPRINT | 20 chapters | Partial | Future foundational architecture: Cortex 2.0, knowledge graph, digital twin, multi-agent system. |
| MISSION CONTROL | 30 chapters | Mixed | Near-term buildable gaps plus intentionally deferred long-term vision. |
| SHADECODE AI BLUEPRINT | 7 volumes | Partial | AI philosophy, multi-agent design, safety/integrity; overlaps Engineering Blueprint. |
| SHADECODE PLATFORM BLUEPRINT | 6 volumes | Partial | Multi-platform and subject-workspace vision; web-first remains appropriate now. |
| SHADECODE DESIGN SYSTEM | 1 volume | Substantial, informal | Design principles exist; formal tokens/component governance remain future work. |
| SHADECODE SCIENCE PLATFORM | 5 volumes | Future vision | Virtual labs, simulation and practical training; future product line. |
| Eighth series | Included in 92-file corpus | Needs exact naming | Do not guess the name; recover it from the source corpus/index. |

## Classification rule

Every blueprint item should be classified before implementation:

1. Already implemented
2. Partially implemented / incrementable now
3. Specified but intentionally deferred
4. Future product / future platform
5. Requires product-owner decision
6. Historical artifact not yet recovered

## Search-before-create rule

Before implementing a blueprint item, search the repository, database schema, existing modules, tasks, and prior agent work for an existing implementation. Extend compatible systems instead of creating parallel systems.

The 2026-08-07 Retention Risk work is the reference example: `topic_mastery` existed but was orphaned, and the recommendation engine already existed, so the implementation wired the orphaned data into the existing engine instead of creating a second priority system.

## Next pass

- Recover the exact eighth series name.
- Map all 92 source documents to canonical names/references.
- Preserve historical blueprint structure and wording when indexing it.
- Record contradictions and superseded versions rather than silently replacing them.
- Keep future company-scale vision separate from current Phase 0/1 engineering tasks.
