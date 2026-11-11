import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LessonDiagram from "./LessonDiagram";

describe("curriculum visual assets", () => {
  it.each([
    ["scarcity-choice-flow", "scarcity"],
    ["production-possibility-curve", "production possibility curve"],
    ["ceteris-paribus-model", "ceteris paribus"],
    ["economic-time-horizons", "short run"],
    ["factors-of-production-model", "factors of production"],
    ["flowchart", "flowchart"],
    ["resource-allocation-questions", "what"],
    ["positive-normative-claims", "positive"],
    ["economics-inquiry-cycle", "observe"],
    ["economic-systems-comparison", "market"],
    ["goods-classification-map", "scarcity"],
    ["public-good-test", "non-rival"],
    ["merit-demerit-information", "under-consumption"],
  ])("renders %s as an accessible offline SVG", (kind, expectedLabel) => {
    const html = renderToStaticMarkup(<LessonDiagram kind={kind} title={kind} />);
    expect(html).toContain("<svg");
    expect(html).toContain('role="img"');
    expect(html.toLowerCase()).toContain(expectedLabel);
    expect(html).not.toContain("Visual aid:");
  });
});
