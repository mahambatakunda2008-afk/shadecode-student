import { describe, expect, it } from "vitest";
import { buildCuratedLearnBlocks, economics9708AS11Pack, economics9708AS12Pack, economics9708AS13Pack, economics9708AS14Pack, economics9708AS15Pack, getCuratedEconomics9708Pack } from "./curatedLessonPack";
import scarcitySource from "../../../docs/curriculum/lessons/economics-9708-as-1.1-scarcity-choice-opportunity-cost.json";
import methodologySource from "../../../docs/curriculum/lessons/economics-9708-as-1.2-economic-methodology.json";
import factorsSource from "../../../docs/curriculum/lessons/economics-9708-as-1.3-factors-of-production.json";
import systemsSource from "../../../docs/curriculum/lessons/economics-9708-as-1.4-economic-systems.json";
import ppcSource from "../../../docs/curriculum/lessons/economics-9708-as-1.5-production-possibility-curves.json";

describe("curated Economics lesson integration", () => {
  it.each([
    ["1.1", economics9708AS11Pack, scarcitySource],
    ["1.2", economics9708AS12Pack, methodologySource],
    ["1.3", economics9708AS13Pack, factorsSource],
    ["1.4", economics9708AS14Pack, systemsSource],
    ["1.5", economics9708AS15Pack, ppcSource],
  ])("adapts authored AS %s content to Learn renderer blocks", (_topic, pack, source) => {
    expect(pack.blocks.length).toBeGreaterThanOrEqual(12);
    expect(pack.blocks.some((block) => block.type === "objective")).toBe(true);
    expect(pack.blocks.some((block) => block.type === "concept")).toBe(true);
    expect(pack.blocks.some((block) => block.type === "checkpoint")).toBe(true);
    expect(pack.blocks.some((block) => block.type === "practice")).toBe(true);
    expect(pack.blocks.every((block) => typeof block.content === "string" && block.content.trim().length > 0)).toBe(true);
    expect(pack.status).toBe("draft_content_requires_subject_review");
    expect(pack.source).toContain("697423");
    expect(source.learningObjectives.length).toBeGreaterThan(0);
    expect(pack.blocks.filter((block) => block.type === "diagram")).toHaveLength(source.visuals.length);
  });


  it.each([
    ["1.1", scarcitySource],
    ["1.2", methodologySource],
    ["1.3", factorsSource],
    ["1.4", systemsSource],
    ["1.5", ppcSource],
  ])("requires traceable, offline visual assets for AS %s", (_topic, source) => {
    expect(source.visuals.length).toBeGreaterThan(0);
    for (const visual of source.visuals) {
      expect(visual.assetId).toBeTruthy();
      expect(visual.type).toBeTruthy();
      expect(visual.title).toBeTruthy();
      expect(visual.purpose).toBeTruthy();
      expect(visual.learningObjectiveIds.length).toBeGreaterThan(0);
      expect(visual.altText.length).toBeGreaterThan(30);
      expect(visual.source).toMatch(/^original_instructional_(diagram|graph_illustrative_not_measured_data)$/);
      expect(visual.offlineIncluded).toBe(true);
      expect(visual.practiceModes.length).toBeGreaterThan(0);
      expect(source.offline.assets.some((asset) => asset.assetId === visual.assetId && asset.offlineIncluded)).toBe(true);
    }
    expect(source.offline.networkRequired).toBe(false);
    expect(source.offline.aiRequired).toBe(false);
  });

  it("covers all Economic Methodology outcomes without collapsing the time periods", () => {
    const text = JSON.stringify(methodologySource).toLowerCase();
    for (const phrase of ["social science", "positive statements", "normative statements", "ceteris paribus", "short run", "long run", "very long run"]) {
      expect(text).toContain(phrase);
    }
    expect(methodologySource.learningObjectives).toHaveLength(4);
  });


  it("covers the five Factors of Production outcomes", () => {
    const text = JSON.stringify(factorsSource).toLowerCase();
    for (const phrase of ["land, labour, capital and enterprise", "human capital", "physical capital", "rewards", "division of labour", "specialisation", "risk"]) {
      expect(text).toContain(phrase);
    }
    expect(factorsSource.learningObjectives).toHaveLength(5);
  });

  it("does not expose assessment answer keys or marking guidance in learner-visible blocks", () => {
    const visible = JSON.stringify([
      ...buildCuratedLearnBlocks(scarcitySource),
      ...buildCuratedLearnBlocks(methodologySource),
      ...buildCuratedLearnBlocks(factorsSource),
    ]).toLowerCase();
    expect(visible).not.toContain("marking guidance");
    expect(visible).not.toContain('"answer":');
    expect(visible).not.toContain("expectedEvidence".toLowerCase());
    expect(visible).not.toContain("us$900 value/return forgone");
  });

  it("resolves only the supported pack identifiers", () => {
    expect(getCuratedEconomics9708Pack("economics-9708-as-1.1")).toBe(economics9708AS11Pack);
    expect(getCuratedEconomics9708Pack("economics-9708-as-1.2")).toBe(economics9708AS12Pack);
    expect(getCuratedEconomics9708Pack("economics-9708-as-1.3")).toBe(economics9708AS13Pack);
    expect(getCuratedEconomics9708Pack("economics-9708-as-1.4")).toBe(economics9708AS14Pack);
    expect(getCuratedEconomics9708Pack("economics-9708-as-1.5")).toBe(economics9708AS15Pack);
    expect(getCuratedEconomics9708Pack("economics-9708-a-level")).toBeNull();
  });
});
