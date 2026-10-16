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

  it("escapes HTML and script so untrusted question text cannot run in another player's browser", () => {
    const html = renderMath('Solve <img src=x onerror=alert(1)> and <script>alert(2)</script> then $x^2$');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;img");
    expect(html).toContain("katex");
    expect(renderMath('<a href="javascript:alert(1)">click</a>')).not.toContain("<a ");
    expect(renderMath('<b onclick="x()">bold</b>')).not.toContain("onclick=\"");
  });

  it("keeps harmless formatting tags that exam text uses", () => {
    expect(renderMath("H<sub>2</sub>O and x<sup>2</sup>")).toBe("H<sub>2</sub>O and x<sup>2</sup>");
    expect(renderMath("line one<br>line two")).toBe("line one<br />line two");
    expect(renderMath("5 < 7 and 9 > 2")).toBe("5 &lt; 7 and 9 &gt; 2");
  });

  it("does not let maths delimiters smuggle markup past the escaping", () => {
    const html = renderMath("$<img src=x onerror=alert(1)>$");
    expect(html).not.toContain("<img");
  });
});
