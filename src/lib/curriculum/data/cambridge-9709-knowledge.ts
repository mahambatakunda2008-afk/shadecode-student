import knowledge from "./cambridge-9709-knowledge-2026-2027.json";

/**
 * Whole-syllabus knowledge layer for Cambridge AS & A Level Mathematics 9709 (2026-2027, version 4), authored from
 * the official PDF. curriculum_knowledge rows are matched on the learner's exact level, so each item is expanded once
 * per level it applies to: AS Level covers Papers 1, 2, 4, 5; A Level covers Papers 1, 3, 4, 5, 6.
 */
export type KnowledgeLevel = "as_level" | "a_level";

export interface KnowledgeSeedRow {
  level: KnowledgeLevel;
  kind: string;
  key: string;
  title: string;
  content: string;
  topicKey: string | null;
  paperComponentId: string | null;
  objectiveKeys: string[];
  metadata: Record<string, unknown>;
}

export const CAMBRIDGE_9709_KNOWLEDGE_META = knowledge.meta;

const codeUnitCompare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function buildCambridge9709KnowledgeRows(): KnowledgeSeedRow[] {
  const rows: KnowledgeSeedRow[] = [];
  for (const item of knowledge.items as Array<{ levels: string[]; kind: string; key: string; title: string; content: string; topicKey: string | null; paperComponentId: string | null; objectiveKeys: string[]; metadata: Record<string, unknown>; contentByLevel?: Record<string, string> }>) {
    for (const level of item.levels as KnowledgeLevel[]) {
      rows.push({ level, kind: item.kind, key: item.key, title: item.title, content: item.contentByLevel?.[level] ?? item.content, topicKey: item.topicKey, paperComponentId: item.paperComponentId, objectiveKeys: item.objectiveKeys, metadata: item.metadata });
    }
  }
  return rows.sort((a, b) => codeUnitCompare(a.level, b.level) || codeUnitCompare(a.key, b.key));
}

/** Canonical line per row; the md5 of the joined lines is checked against the database. */
export function canonicalKnowledgeLine(row: KnowledgeSeedRow): string {
  return [row.level, row.kind, row.key, row.title, row.content, row.topicKey ?? "", row.paperComponentId ?? "", row.objectiveKeys.join(",")].join("|");
}
