# Shadecode Blueprint Registry

This registry is the navigation and status index for the strategic blueprint system. It is intentionally conservative: an item should only be listed as present when its actual source document has been located.

## Status legend

- **Located:** source exists in the repository and has been identified.
- **In progress:** source exists but the planned work is incomplete.
- **Gap:** the project refers to the artifact, but the canonical source has not yet been located or created.
- **Superseded:** replaced by a newer approved artifact.
- **Archived:** retained for history but not active authority.

## Core strategic artifacts

| Artifact | Status | Canonical source | Notes |
|---|---|---|---|
| Master Blueprint | Gap / to locate | TBD | Do not invent a replacement until historical source material is located. |
| Blueprint volumes | Gap / to locate | TBD | Historical project work refers to multiple volumes; enumerate exact sources before reconstruction. |
| Platform blueprint | Gap / to locate | TBD | Must cover platform-level evolution separately from implementation details. |
| Labs blueprint | Gap / to locate | TBD | Experimental governance should connect to the knowledge-governance rules. |
| Shadecode Student blueprint | Gap / to locate | TBD | Product-specific strategy should be distinguished from current architecture. |
| Shadecode ecosystem blueprint | Gap / to locate | TBD | Covers Student, SCS, Idea Vault and future products where applicable. |
| Distributed Intelligence Architecture | Superseded strategic proposal | `docs/SHADECODE_DISTRIBUTED_INTELLIGENCE_ARCHITECTURE.md` | Earlier proposal focused primarily on distributed intelligence. Retained as historical context. |
| Distributed Infrastructure Architecture | Located / current strategic proposal | `docs/SHADECODE_DISTRIBUTED_INFRASTRUCTURE_ARCHITECTURE.md` | Current direction expands decentralization beyond AI to compute, storage, knowledge, synchronization, content delivery, and selected services. User devices are first-class infrastructure nodes; cloud is optional infrastructure. |

## Existing implementation knowledge

- `docs/ARCHITECTURE.md` — verified current implementation architecture and strategic direction.
- `docs/AUDIT_2026-08.md` — detailed audit record.
- `docs/FINAL_AUDIT_REPORT_2026-08.md` — consolidated audit and release-readiness assessment.
- `docs/SHADENET_DECENTRALIZED_EDUCATION_NETWORK.md` — decentralized educational content/network architecture.
- `docs/SHADECODE_DISTRIBUTED_INTELLIGENCE_ARCHITECTURE.md` — superseded strategic proposal focused on distributed intelligence.
- `docs/SHADECODE_DISTRIBUTED_INFRASTRUCTURE_ARCHITECTURE.md` — current strategic proposal for device-native distributed infrastructure.
- `AGENTS.md` — repository agent rules and Cortex architecture orientation.
- `prompts/` — reusable implementation and product prompts, including documentation and domain-specific prompts.
- `.cortex/` — autonomous Cortex operational artifacts and live agent state.

## Registry rule

The registry must be updated when a canonical blueprint is located, created, superseded, or archived. Do not fill a gap with guessed content. Historical material should be recovered first; newly written material must be explicitly labelled as new.

## Next registry pass

1. Search repository history for blueprint/volume/platform/lab artifacts.
2. Search project documentation for references to exact blueprint names.
3. Recover located artifacts and link them here.
4. Mark genuinely missing artifacts as gaps.
5. Only then reconstruct missing documents, preserving the distinction between recovered history and newly authored strategy.
