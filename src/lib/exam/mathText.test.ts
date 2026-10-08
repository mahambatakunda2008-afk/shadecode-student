import { describe, expect, it } from "vitest";
import { renderMath } from "./mathText";

describe("renderMath", () => {
  it("renders inline $...$ maths", () => {
    const html = renderMath("Solve $x^2 + 2x - 3 = 0$. Give the larger root.");
    expect(html).toContain("katex");
    expect(html).not.toContain("$");
    expect(html).toContain("Give the larger root.");
  });
  it("renders display $$...$$ maths separately from inline", () => {
    const html = renderMath("$$x = 1$$ and $y = 2$");
    expect(html.match(/katex-display/g)).toHaveLength(1);
    expect(html.match(/class="katex"/g)?.length).toBeGreaterThanOrEqual(2);
  });
  it("leaves text without maths untouched and tolerates empty input", () => {
    expect(renderMath("Calculate the power in W.")).toBe("Calculate the power in W.");
    expect(renderMath("")).toBe("");
  });
});
