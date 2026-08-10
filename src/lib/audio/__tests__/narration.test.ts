import { describe, it, expect } from "vitest";
import { buildNarrationScript } from "../narration";

describe("buildNarrationScript", () => {
  it("narrates a plain paragraph block verbatim", () => {
    const script = buildNarrationScript([{ type: "paragraph", content: "Cells are the basic unit of life." }]);
    expect(script).toEqual([{ index: 0, type: "paragraph", text: "Cells are the basic unit of life." }]);
  });

  it("prefixes a tip block so it makes sense heard without the visual label", () => {
    const script = buildNarrationScript([{ type: "tip", content: "Always check your units." }]);
    expect(script[0].text).toBe("Tip. Always check your units.");
  });

  it("prefixes an example block", () => {
    const script = buildNarrationScript([{ type: "example", content: "A car accelerating from rest." }]);
    expect(script[0].text).toBe("For example. A car accelerating from rest.");
  });

  it("replaces math content with a spoken substitute instead of reading raw notation aloud", () => {
    const script = buildNarrationScript([{ type: "math", content: "E = mc^2" }]);
    expect(script[0].text).not.toContain("mc^2");
    expect(script[0].text.length).toBeGreaterThan(0);
  });

  it("preserves block order and original index", () => {
    const blocks = [
      { type: "paragraph", content: "First." },
      { type: "math", content: "x = 1" },
      { type: "tip", content: "Third." },
    ];
    const script = buildNarrationScript(blocks);
    expect(script.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(script[0].text).toContain("First.");
    expect(script[2].text).toContain("Third.");
  });

  it("handles an empty block list", () => {
    expect(buildNarrationScript([])).toEqual([]);
  });

  it("handles an unrecognized block type as plain content, no crash", () => {
    const script = buildNarrationScript([{ type: "unknown-future-type", content: "Something new." }]);
    expect(script[0].text).toBe("Something new.");
  });
});
