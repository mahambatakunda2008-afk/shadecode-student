import { describe, expect, it } from "vitest";
import { buildCuratedLearnBlocks, economics9708AS11Pack, economics9708AS12Pack, getCuratedEconomics9708Pack } from "./curatedLessonPack";
import scarcitySource from "../../../docs/curriculum/lessons/economics-9708-as-1.1-scarcity-choice-opportunity-cost.json";
import methodologySource from "../../../docs/curriculum/lessons/economics-9708-as-1.2-economic-methodology.json";

describe("curated Economics lesson integration", () => {
  it.each([
    ["1.1", economics9708AS11Pack, scarcitySource],
    ["1.2", economics9708AS12Pack, methodologySource],
  ])("adapts authored AS %s content to Learn renderer blocks", (_topic, pack, source) => {
    expect(pack.blocks.length).toBeGreaterThanOrEqual(12);
    expect(pack.blocks.some((block) => block.type === "concept")).toBe(true);
    expect(pack.blocks.some((block) => block.type === "checkpoint")).toBe(true);
    expect(pack.blocks.some((block) => block.type === "practice")).toBe(true);
    expect(pack.blocks.every((block) => typeof block.content === "string" && block.content.trim().length > 0)).toBe(true);
    expect(pack.status).toBe("draft_content_requires_subject_review");
    expect(pack.source).toContain("697423");
    expect(source.learningObjectives.length).toBe(4);
  });

  it("does not expose assessment answer keys or marking guidance in learner-visible blocks", () => {
    const visible = JSON.stringify([
      ...buildCuratedLearnBlocks(scarcitySource),
      ...buildCuratedLearnBlocks(methodologySource),
    ]).toLowerCase();
    expect(visible).not.toContain("marking guidance");
    expect(visible).not.toContain('"answer":');
    expect(visible).not.toContain("expectedEvidence".toLowerCase());
    expect(visible).not.toContain("us$900 value/return forgone");
  });

  it("resolves only the supported pack identifiers", () => {
    expect(getCuratedEconomics9708Pack("economics-9708-as-1.1")).toBe(economics9708AS11Pack);
    expect(getCuratedEconomics9708Pack("economics-9708-as-1.2")).toBe(economics9708AS12Pack);
    expect(getCuratedEconomics9708Pack("economics-9708-a-level")).toBeNull();
  });
});
