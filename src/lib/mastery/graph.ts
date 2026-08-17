export type MasteryEvidence = {
  topicId: string;
  masteryScore: number;
  confidence?: number;
  evidenceCount?: number;
  lastSeenAt?: string | null;
  misconception?: string | null;
};

export type KnowledgeNode = {
  topicId: string;
  mastery: number;
  confidence: number;
  evidenceCount: number;
  recency: number;
  misconception: string | null;
};

export type KnowledgeEdge = {
  from: string;
  to: string;
  relation: "prerequisite" | "related";
  weight: number;
};

const DAY = 86_400_000;

function clamp(value: number, min = 0, max = 1): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function recencyScore(lastSeenAt: string | null | undefined, now: Date): number {
  if (!lastSeenAt) return 0;
  const timestamp = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  const ageDays = Math.max(0, (now.getTime() - timestamp) / DAY);
  return Math.exp(-ageDays / 30);
}

export function buildKnowledgeGraph(
  evidence: MasteryEvidence[],
  edges: KnowledgeEdge[] = [],
  now = new Date(),
): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
  const byTopic = new Map<string, MasteryEvidence>();
  for (const item of evidence) {
    const topicId = item.topicId.trim();
    if (!topicId) continue;
    const existing = byTopic.get(topicId);
    if (!existing || (item.evidenceCount ?? 0) >= (existing.evidenceCount ?? 0)) {
      byTopic.set(topicId, { ...item, topicId });
    }
  }

  const nodes = [...byTopic.values()].map((item) => ({
    topicId: item.topicId,
    mastery: clamp(item.masteryScore / 100),
    confidence: clamp(item.confidence ?? Math.min(1, Math.max(0, item.evidenceCount ?? 0) / 10)),
    evidenceCount: Math.max(0, item.evidenceCount ?? 0),
    recency: recencyScore(item.lastSeenAt, now),
    misconception: item.misconception?.trim() || null,
  }));

  const validIds = new Set(nodes.map((node) => node.topicId));
  const validEdges = edges
    .filter(
      (edge) => validIds.has(edge.from) && validIds.has(edge.to) && edge.from !== edge.to,
    )
    .map((edge) => ({ ...edge, weight: clamp(edge.weight) }));

  return { nodes, edges: validEdges };
}

export function rankNextTopics(
  graph: ReturnType<typeof buildKnowledgeGraph>,
): KnowledgeNode[] {
  const prerequisitePressure = new Map<string, number>();
  const byId = new Map(graph.nodes.map((node) => [node.topicId, node]));

  for (const edge of graph.edges) {
    if (edge.relation !== "prerequisite") continue;
    const source = byId.get(edge.from);
    if (!source) continue;
    prerequisitePressure.set(
      edge.to,
      (prerequisitePressure.get(edge.to) ?? 0) + (1 - source.mastery) * edge.weight,
    );
  }

  const score = (node: KnowledgeNode) =>
    (1 - node.mastery) * 0.55 +
    (1 - node.confidence) * 0.15 +
    (1 - node.recency) * 0.1 +
    (node.misconception ? 0.15 : 0) +
    (prerequisitePressure.get(node.topicId) ?? 0) * 0.05;

  return [...graph.nodes].sort((a, b) => score(b) - score(a));
}

export function summarizeKnowledgeState(graph: ReturnType<typeof buildKnowledgeGraph>) {
  if (graph.nodes.length === 0) {
    return { averageMastery: 0, lowMasteryCount: 0, misconceptionCount: 0 };
  }

  return {
    averageMastery: graph.nodes.reduce((sum, node) => sum + node.mastery, 0) / graph.nodes.length,
    lowMasteryCount: graph.nodes.filter((node) => node.mastery < 0.6).length,
    misconceptionCount: graph.nodes.filter((node) => Boolean(node.misconception)).length,
  };
}
