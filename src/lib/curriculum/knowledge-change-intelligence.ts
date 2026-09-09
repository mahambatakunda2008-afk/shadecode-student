import type { CurriculumKnowledgeItem } from "./knowledge";

export type CurriculumKnowledgeChangeType =
  | "added"
  | "removed"
  | "modified"
  | "moved"
  | "relationship_changed"
  | "possible_rename"
  | "unchanged";

export interface CurriculumKnowledgeChange {
  type: CurriculumKnowledgeChangeType;
  previous?: CurriculumKnowledgeItem;
  current?: CurriculumKnowledgeItem;
  confidence: number;
  requiresVerification: boolean;
  reason: string;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string): number {
  const left = new Set(normalize(a).split(" ").filter((token) => token.length > 2));
  const right = new Set(normalize(b).split(" ").filter((token) => token.length > 2));
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / new Set([...left, ...right]).size;
}

function relationshipSignature(item: CurriculumKnowledgeItem): string {
  return JSON.stringify({
    parentId: item.parentId ?? null,
    topicCode: item.topicCode ?? null,
    objectiveIds: [...(item.objectiveIds ?? [])].sort(),
    paperComponentId: item.identity.paperComponentId ?? null,
  });
}

export function diffCurriculumKnowledge(
  previous: CurriculumKnowledgeItem[],
  current: CurriculumKnowledgeItem[],
): CurriculumKnowledgeChange[] {
  const previousByKey = new Map(previous.map((item) => [knowledgeKey(item), item]));
  const currentByKey = new Map(current.map((item) => [knowledgeKey(item), item]));
  const changes: CurriculumKnowledgeChange[] = [];

  for (const item of previous) {
    const replacement = currentByKey.get(knowledgeKey(item));
    if (!replacement) {
      changes.push({ type: "removed", previous: item, confidence: 1, requiresVerification: true, reason: "Knowledge item is absent from the new extraction." });
      continue;
    }

    const contentChanged = normalize(item.content) !== normalize(replacement.content);
    const relationshipChanged = relationshipSignature(item) !== relationshipSignature(replacement);
    if (contentChanged) {
      changes.push({ type: "modified", previous: item, current: replacement, confidence: 1, requiresVerification: true, reason: "Knowledge content changed while the stable key remained present." });
    } else if (relationshipChanged) {
      changes.push({ type: "relationship_changed", previous: item, current: replacement, confidence: 1, requiresVerification: true, reason: "Parent, topic, objective, or paper relationship changed." });
    } else {
      changes.push({ type: "unchanged", previous: item, current: replacement, confidence: 1, requiresVerification: false, reason: "Stable key, content, and relationships are unchanged." });
    }
  }

  for (const item of current) {
    if (previousByKey.has(knowledgeKey(item))) continue;
    changes.push({ type: "added", current: item, confidence: 1, requiresVerification: true, reason: "Knowledge item is present in the new extraction but not the previous one." });
  }

  const removed = changes.filter((change) => change.type === "removed");
  const added = changes.filter((change) => change.type === "added");
  const paired = new Set<CurriculumKnowledgeChange>();
  for (const removal of removed) {
    let best: CurriculumKnowledgeChange | undefined;
    let score = 0;
    for (const addition of added) {
      if (paired.has(addition) || removal.previous?.kind !== addition.current?.kind) continue;
      const candidate = similarity(removal.previous?.content ?? "", addition.current?.content ?? "");
      if (candidate >= 0.72 && candidate > score) { best = addition; score = candidate; }
    }
    if (!best) continue;
    paired.add(best);
    removal.type = "possible_rename";
    removal.confidence = score;
    removal.reason = "Removed and added items have substantial lexical overlap; verify rename/recode.";
    best.type = "possible_rename";
    best.confidence = score;
    best.reason = "Added item closely resembles a removed item; verify rename/recode.";
  }

  return changes;
}

export function knowledgeKey(item: CurriculumKnowledgeItem): string {
  return [item.kind, item.code ?? "", normalize(item.title)].join("|");
}
