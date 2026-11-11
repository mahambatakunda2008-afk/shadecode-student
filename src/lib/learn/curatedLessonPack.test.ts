import { describe, expect, it } from "vitest";
import { buildEconomics9708AS11LearnBlocks, economics9708AS11Pack } from "./curatedLessonPack";

describe("curated Economics lesson integration", () => {
  it("adapts authored lesson sections to the existing Learn renderer", () => {
    const blocks = buildEconomics9708AS11LearnBlocks();
    expect(blocks.length).toBeGreaterThanOrEqual(12);
    expect(blocks.some((block) => block.type === "concept")).toBe(true);
    expect(blocks.some((block) => block.type === "example")).toBe(true);
    expect(blocks.some((block) => block.type === "checkpoint")).toBe(true);
    expect(blocks.some((block) => block.type === "practice")).toBe(true);
    expect(blocks.every((block) => typeof block.content === "string" && block.content.trim().length > 0)).toBe(true);
  });

  it("does not expose answer keys or marking guidance in learner-visible blocks", () => {
    const visible = JSON.stringify(buildEconomics9708AS11LearnBlocks()).toLowerCase();
    expect(visible).not.toContain("marking guidance");
    expect(visible).not.toContain("next best alternative</");
    expect(visible).not.toContain('"answer":');
    expect(visible).not.toContain("expectedEvidence".toLowerCase());
  });

  it("keeps the pack offline-ready and transparently marked as draft", () => {
    expect(economics9708AS11Pack.status).toBe("draft_content_requires_subject_review");
    expect(economics9708AS11Pack.source).toContain("697423");
    expect(economics9708AS11Pack.blocks.length).toBeGreaterThan(0);
  });
});
