import { beforeEach, describe, expect, it, vi } from "vitest";
import { createResource } from "../content";
import { retrieveKnowledge, searchKnowledgeResources, type KnowledgeSource } from "../retrieval";

async function resource(title: string, content: string, subject = "Physics") {
  return createResource({
    metadata: {
      type: "lesson" as const,
      title,
      subject,
      qualification: "Cambridge AS",
      syllabus: "9702",
      verificationStatus: "community" as const,
      createdAt: "2026-10-20T00:00:00.000Z",
    },
    content,
  });
}

describe("AI-independent ShadeNet retrieval", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("ranks local material deterministically without an AI call", async () => {
    const wave = await resource("Waves and superposition", "Wavefronts and interference.");
    const circuits = await resource("DC circuits", "Resistance and current.");
    const results = searchKnowledgeResources([circuits, wave], { query: "waves superposition" });
    expect(results.map((item) => item.metadata.title)).toEqual(["Waves and superposition"]);
  });

  it("applies subject and syllabus filters", async () => {
    const physics = await resource("Waves", "Wave motion");
    const chemistry = await resource("Waves", "Not relevant", "Chemistry");
    const results = searchKnowledgeResources([physics, chemistry], {
      query: "waves",
      subject: "Physics",
      syllabus: "9702",
    });
    expect(results).toHaveLength(1);
    expect(results[0].metadata.subject).toBe("Physics");
  });

  it("falls through from an unavailable peer to online resources and verifies content", async () => {
    const valid = await resource("Electric fields", "Field strength and potential.");
    const tampered = { ...valid, content: "Injected content" };
    const peers: KnowledgeSource = {
      kind: "peer",
      search: async () => { throw new Error("peer is offline"); },
    };
    const online: KnowledgeSource = {
      kind: "online",
      search: async () => [tampered, valid],
    };
    const result = await retrieveKnowledge(
      { query: "electric fields", limit: 4 },
      {
        local: { search: async () => [] },
        peers,
        online,
        perSourceTimeoutMs: 1000,
      },
    );
    expect(result.attempted).toEqual(["local", "peer", "online"]);
    expect(result.unavailable).toEqual(["peer"]);
    expect(result.results).toHaveLength(1);
    expect(result.results[0].source).toBe("online");
    expect(result.results[0].resource.content).toBe("Field strength and potential.");
  });

  it("bounds a stuck source and continues to the next layer", async () => {
    const valid = await resource("Momentum", "Conservation of momentum.");
    const peers: KnowledgeSource = {
      kind: "peer",
      search: (_query, signal) => new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }),
    };
    const online: KnowledgeSource = { kind: "online", search: async () => [valid] };
    const result = await retrieveKnowledge(
      { query: "momentum" },
      { local: { search: async () => [] }, peers, online, perSourceTimeoutMs: 250 },
    );
    expect(result.unavailable).toContain("peer");
    expect(result.results[0]?.resource.metadata.title).toBe("Momentum");
  });

  it("does not return results for an empty query without filters", () => {
    expect(searchKnowledgeResources([], { query: " " })).toEqual([]);
  });
});
