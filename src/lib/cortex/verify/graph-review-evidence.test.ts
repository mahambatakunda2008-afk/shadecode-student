import { describe, expect, it } from "vitest";
import { collectGraphReviewHints } from "./graph-review-evidence";

describe("graph review evidence hints", () => {
  it("retains axis, units, scale, coordinates and plot instructions as unverified anchors", () => {
    const hints = collectGraphReviewHints([
      { page: 2, line: 1, text: "Label the x-axis with time / s." },
      { page: 2, line: 2, text: "Use a scale of 2 cm per division." },
      { page: 2, line: 3, text: "Plot the points (2, 4) and (4, 8)." },
      { page: 2, line: 4, text: "Calculate the gradient of the best-fit line." },
    ]);
    expect(hints.map(hint => hint.type)).toEqual(
      expect.arrayContaining(["axis", "unit", "scale", "coordinate", "plot_instruction", "trend_or_gradient", "diagram_label"]),
    );
    expect(hints.every(hint => hint.page === 2 && hint.confidence === "candidate" && hint.interpretation === "unverified")).toBe(true);
    expect(hints.find(hint => hint.type === "coordinate")?.sourceText).toContain("(2, 4)");
  });

  it("extracts explicit coordinate, axis, unit and scale candidates without claiming visual verification", () => {
    const hints = collectGraphReviewHints([
      { page: 3, line: 1, text: "Label the x-axis time / s and the y-axis distance / m." },
      { page: 3, line: 2, text: "Use a scale of 2 cm per division." },
      { page: 3, line: 3, text: "Plot coordinates (1.5, 3) and (-2, 4.25)." },
    ]);
    const coordinates = hints.find(hint => hint.type === "coordinate");
    expect(coordinates?.candidateDetails).toEqual([
      "Coordinate candidate: (1.5, 3)",
      "Coordinate candidate: (-2, 4.25)",
    ]);
    expect(hints.find(hint => hint.type === "axis")?.candidateDetails).toContain("X-axis label candidate: time / s");
    expect(hints.find(hint => hint.type === "unit")?.candidateDetails).toContain("Unit candidates: s, m");
    expect(hints.find(hint => hint.type === "scale")?.candidateDetails[0]).toContain("2 cm per division");
    expect(hints.every(hint => hint.interpretation === "unverified" && hint.confidence === "candidate")).toBe(true);
  });

  it("does not manufacture graph data from ordinary prose", () => {
    expect(collectGraphReviewHints([
      { page: 1, line: 1, text: "The student explains the method clearly." },
    ])).toEqual([]);
  });
});
