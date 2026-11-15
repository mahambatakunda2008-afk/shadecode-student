import { describe, expect, it } from "vitest";
import { createResource } from "../content";
import { assessKnowledgeSources } from "../source-assessment";

async function resource(title: string, host: string, content: Record<string, unknown> = {}) {
  return createResource({
    metadata: { type: "other", title, subject: "Physics", source: `https://${host}/article`, authorOrPublisher: host, verificationStatus: "unverified", createdAt: "2026-11-15T00:00:00.000Z" },
    content: { kind: "web-document", text: "Waves transfer energy through oscillations.", ...content },
  });
}

describe("ShadeNet source assessment", () => {
  it("recognises configured exam-board domains without upgrading verification status", async () => {
    const item = await resource("Cambridge wave motion", "www.cambridgeinternational.org", { publishedAt: "2026-01-01" });
    const [assessed] = assessKnowledgeSources([item], Date.parse("2026-11-15T00:00:00.000Z"));
    expect(assessed.assessment.authority).toBe("official-exam-board");
    expect(assessed.assessment.freshness).toBe("current");
    expect(assessed.resource.metadata.verificationStatus).toBe("unverified");
  });

  it("does not infer freshness from retrieval/creation time", async () => {
    const item = await resource("Wave motion", "randomblog.example");
    const [assessed] = assessKnowledgeSources([item], Date.parse("2026-11-15T00:00:00.000Z"));
    expect(assessed.assessment.freshness).toBe("undated");
  });

  it("counts distinct publisher hosts rather than duplicate pages on one host", async () => {
    const a = await resource("Wave motion and energy transfer", "one.example");
    const b = await resource("Wave motion and energy transfer", "www.one.example");
    const [first, second] = assessKnowledgeSources([a, b]);
    expect(first.assessment.relatedHostCount).toBe(1);
    expect(second.assessment.relationship).toBe("single-source");
  });

  it("marks similar coverage across distinct hosts without calling it fact verification", async () => {
    const a = await resource("Wave motion and energy transfer", "school.edu", { publishedAt: "2024-01-01" });
    const b = await resource("Wave motion and energy transfer", "physics.org", { publishedAt: "2025-01-01" });
    const [first] = assessKnowledgeSources([a, b]);
    expect(first.assessment.relatedHostCount).toBe(2);
    expect(first.assessment.relationship).toBe("similar-coverage");
    expect(first.assessment.reviewFlags).toEqual([]);
  });

  it("flags differing numerical details for manual comparison", async () => {
    const a = await resource("Wave motion and energy transfer", "school.edu", { text: "The frequency is 50 Hz." });
    const b = await resource("Wave motion and energy transfer", "physics.org", { text: "The frequency is 60 Hz." });
    const [first] = assessKnowledgeSources([a, b]);
    expect(first.assessment.reviewFlags.join(" ")).toContain("Different numerical details");
  });
});
