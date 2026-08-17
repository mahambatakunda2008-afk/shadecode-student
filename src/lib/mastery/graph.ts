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
  return Math.min(max, Math.max(min, value));
}

export function buildKnowledgeGraph(
  evidence: MasteryEvidence[],
  edges: KnowledgeEdge[] = [],
  now = new Date(),
): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
  const nodes = evidence.map((item) => {
    const mastery = clamp(item.masteryScore / 100);
    const confidence = clamp(item.confidence ?? Math.min(1, (item.evidenceCount ?? 0) / 10));
    const ageDays = item.lastSeenAt
      ? Math.max(0, (now.getTime() - new Date(item.lastSeenAt).getTime()) / DAY)
      : 365;
    const recency = Math.exp(-ageDays / 30);

    return {
      topicId: item.topicId,
      mastery,
      confidence,
      evidenceCount: Math.max(0, item.evidenceCount ?? 0),
      recency,
      misconception: item.misconception ?? null,
    };
  });

  const validIds = new Set(nodes.map((node) => node.topicId));
  const validEdges = edges.filter(
    (edge) => validIds.has(edge.from) && validIds.has(edge.to) && edge.from !== edge.to,
  );

  return { nodes, edges: validEdges };
}

export function rankNextTopics(
  graph: ReturnType<typeof buildKnowledgeGraph>,
): KnowledgeNode[] {
  const prerequisitePressure = new Map<string, number>();

  for (const edge of graph.edges) {
    if (edge.relation !== "prerequisite") continue;
    const source = graph.nodes.find((node) => node.topicId === edge.from);
    if (!source) continue;
    prerequisitePressure.set(
      edge.to,
      (prerequisitePressure.get(edge.to) ?? 0) + (1 - source.mastery) * clamp(edge.weight),
    );
  }

  return [...graph.nodes].sort((a, b) => {
    const score = (node: KnowledgeNode) =>
      (1 - node.mastery) * 0.55 +
      (1 - node.confidence) * 0.15 +
      (1 - node.recency) * 0.1 +
      (node.misconception ? 0.15 : 0) +
      (prerequisitePressure.get(node.topicId) ?? 0) * 0.05;

    return score(b) - score(a);
  });
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
