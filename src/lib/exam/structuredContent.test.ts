import { describe, expect, it } from "vitest";
import { normalizeExamContent } from "@/components/exam/ExamQuestionContent";

describe("normalizeExamContent", () => {
  it("accepts bounded text, tables, graphs and primitive diagrams", () => {
    const blocks = normalizeExamContent([
      { type: "text", text: "Use the readings below." },
      { type: "table", headers: ["Time / s", "Distance / m"], rows: [["0", "0"], ["2", "8"]] },
      { type: "graph", xLabel: "Time / s", yLabel: "Velocity / m s⁻¹", points: [{ x: 0, y: 0 }, { x: 2, y: 8 }] },
      { type: "diagram", shapes: [{ type: "rect", x: 40, y: 40, width: 120, height: 80, label: "Cell" }, { type: "line", x1: 160, y1: 80, x2: 240, y2: 80 }] },
    ]);
    expect(blocks.map((block) => block.type)).toEqual(["text", "table", "graph", "diagram"]);
  });

  it("rejects unknown block types, unsafe shape data and malformed tables", () => {
    const blocks = normalizeExamContent([
      { type: "html", html: "<script>alert(1)</script>" },
      { type: "table", headers: ["Only one"], rows: [["x"]] },
      { type: "diagram", shapes: [{ type: "path", d: "M0 0" }, { type: "circle", cx: 10, cy: 10, r: -4 }] },
    ]);
    expect(blocks).toEqual([]);
  });

  it("bounds block counts, rows, columns and coordinates", () => {
    const blocks = normalizeExamContent([
      { type: "diagram", shapes: [{ type: "circle", cx: 9999, cy: 20, r: 5 }] },
      { type: "table", headers: ["A", "B"], rows: Array.from({ length: 40 }, () => ["1", "2"]) },
      ...Array.from({ length: 20 }, () => ({ type: "text", text: "extra" })),
    ]);
    expect(blocks.length).toBeLessThanOrEqual(12);
    expect(blocks[0]).toMatchObject({ type: "table", rows: expect.any(Array) });
    if (blocks[0]?.type === "table") expect(blocks[0].rows).toHaveLength(30);
  });

  it("does not pass markup through as raw HTML", () => {
    const blocks = normalizeExamContent([{ type: "text", text: '<img src=x onerror="alert(1)"> $x^2$' }]);
    expect(blocks).toEqual([{ type: "text", text: '<img src=x onerror="alert(1)"> $x^2$' }]);
  });
});