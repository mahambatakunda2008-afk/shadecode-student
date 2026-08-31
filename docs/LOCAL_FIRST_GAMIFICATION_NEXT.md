# Local-first gamification

XP, streak, and achievement helpers now use the canonical local-first store.

Important implementation constraint: XP awards must be idempotent before existing award call sites are migrated. A read-modify-write sequence is not sufficient for cross-tab correctness.
