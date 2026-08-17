import { describe, expect, it } from "vitest";
import { buildKnowledgeGraph, rankNextTopics, summarizeKnowledgeState } from "./graph";

describe("knowledge graph", () => {
  it("builds bounded nodes and removes invalid edges", () => {
    const graph = buildKnowledgeGraph(
      [{ topicId: "a", masteryScore: 40, evidenceCount: 2 }],
      [
        { from: "a", to: "a", relation: "related", weight: 1 },
        { from: "a", to: "missing", relation: "related", weight: 1 },
      ],
    );
    expect(graph.nodes[0].mastery).toBe(0.4);
    expect(graph.edges).toHaveLength(0);
  });

  it("prioritizes weak, uncertain and stale topics", () => {
    const graph = buildKnowledgeGraph([
      { topicId: "strong", masteryScore: 90, confidence: 0.9, lastSeenAt: new Date().toISOString() },
      { topicId: "weak", masteryScore: 25, confidence: 0.2, lastSeenAt: "2025-01-01T00:00:00.000Z" },
    ]);
    expect(rankNextTopics(graph)[0].topicId).toBe("weak");
  });

  it("summarizes an empty graph safely", () => {
    expect(summarizeKnowledgeState(buildKnowledgeGraph([]))).toEqual({
      averageMastery: 0,
      lowMasteryCount: 0,
      misconceptionCount: 0,
    });
  });
});
