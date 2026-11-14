import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CortexResponse, { normalizeCortexResponseText, parseCortexResponseBlocks } from "./CortexResponse";

describe("Cortex response formatting", () => {
  it("keeps headings, paragraphs and separate ordered steps structured", () => {
    const blocks = parseCortexResponseBlocks("## Method\nUse the equation first.\n\n1. Substitute the values.\n2. Simplify the expression.");
    expect(blocks.map(block => block.type)).toEqual(["heading", "paragraph", "list"]);
    expect(blocks[2]).toMatchObject({ ordered: true, items: [{ text: "Substitute the values." }, { text: "Simplify the expression." }] });
  });

  it("recognises tables and fenced working without flattening them into prose", () => {
    const blocks = parseCortexResponseBlocks("| Quantity | Value |\n| --- | --- |\n| Force | 12 N |\n\n\`\`\`text\nF = ma\n\`\`\`");
    expect(blocks.map(block => block.type)).toEqual(["table", "code"]);
  });

  it("renders mathematical notation and safe web links", () => {
    const html = renderToStaticMarkup(
      <CortexResponse text={"The result is $F=ma$. See [the syllabus](https://example.com/syllabus)."} />,
    );
    expect(html).toContain("katex");
    expect(html).toContain('href="https://example.com/syllabus"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("does not turn unsafe link schemes into clickable links", () => {
    const html = renderToStaticMarkup(<CortexResponse text={"[unsafe](javascript:alert(1))"} />);
    expect(html).not.toContain("<a ");
    expect(html).toContain("javascript:alert(1)");
  });
  it("keeps indented continuation lines inside blockquotes", () => {
    const blocks = parseCortexResponseBlocks("> **Working:**\n  Substitute the centre and radius.\n  Then simplify.");
    expect(blocks[0]).toMatchObject({ type: "quote", text: "**Working:**\nSubstitute the centre and radius.\nThen simplify." });
    const html = renderToStaticMarkup(<CortexResponse text={"> **Working:**\n  Substitute the centre and radius.\n  Then simplify."} />);
    expect((html.match(/<blockquote/g) || []).length).toBe(1);
  });

  it("preserves intentional paragraph line breaks and multi-line quotations", () => {
    const blocks = parseCortexResponseBlocks("First line\nSecond line\n\n> A quoted point\n> with its continuation");
    expect(blocks[0]).toMatchObject({ type: "paragraph", text: "First line\nSecond line" });
    expect(blocks[1]).toMatchObject({ type: "quote", text: "A quoted point\nwith its continuation" });
  });

  it("repairs provider-escaped Markdown and HTML entities in worked solutions", () => {
    const sample = String.raw`\### Part 1: Finding the Equation
\*\*Identify the values\*\*: The centre is $(-3, 2)$.
1\. \*\*Substitute the values\*\*:&#x20;
&#x20;   $(x + 3)^2 + (y - 2)^2 = 10$
2\. \*\*Simplify\*\*: The equation is ready.`;
    const blocks = parseCortexResponseBlocks(sample);
    expect(blocks[0]).toMatchObject({ type: "heading", text: "Part 1: Finding the Equation" });
    expect(blocks[1]).toMatchObject({ type: "paragraph", text: "**Identify the values**: The centre is $(-3, 2)$." });
    expect(blocks[2]).toMatchObject({ type: "list", ordered: true });
    expect(blocks[2]).toMatchObject({ items: [{ text: "**Substitute the values**: \n$(x + 3)^2 + (y - 2)^2 = 10$" }, { text: "**Simplify**: The equation is ready." }] });
  });

  it("repairs Markdown punctuation after multiple transport-escaping layers", () => {
    expect(normalizeCortexResponseText("\\\\### Part 2")).toBe("### Part 2");
    expect(normalizeCortexResponseText("\\\\*\\\\*Important\\\\*\\\\*")).toBe("**Important**");
  });

  it("leaves invalid numeric HTML entities intact instead of crashing", () => {
    expect(normalizeCortexResponseText("Invalid: &#x110000; and &#99999999;.")).toBe("Invalid: &#x110000; and &#99999999;.");
  });

  it("preserves escaped LaTeX punctuation inside dollar-delimited maths", () => {
    const inline = String.raw`$\{x\} + \_n + \%import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CortexResponse, { normalizeCortexResponseText, parseCortexResponseBlocks } from "./CortexResponse";

describe("Cortex response formatting", () => {
  it("keeps headings, paragraphs and separate ordered steps structured", () => {
    const blocks = parseCortexResponseBlocks("## Method\nUse the equation first.\n\n1. Substitute the values.\n2. Simplify the expression.");
    expect(blocks.map(block => block.type)).toEqual(["heading", "paragraph", "list"]);
    expect(blocks[2]).toMatchObject({ ordered: true, items: [{ text: "Substitute the values." }, { text: "Simplify the expression." }] });
  });

  it("recognises tables and fenced working without flattening them into prose", () => {
    const blocks = parseCortexResponseBlocks("| Quantity | Value |\n| --- | --- |\n| Force | 12 N |\n\n\`\`\`text\nF = ma\n\`\`\`");
    expect(blocks.map(block => block.type)).toEqual(["table", "code"]);
  });

  it("renders mathematical notation and safe web links", () => {
    const html = renderToStaticMarkup(
      <CortexResponse text={"The result is $F=ma$. See [the syllabus](https://example.com/syllabus)."} />,
    );
    expect(html).toContain("katex");
    expect(html).toContain('href="https://example.com/syllabus"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("does not turn unsafe link schemes into clickable links", () => {
    const html = renderToStaticMarkup(<CortexResponse text={"[unsafe](javascript:alert(1))"} />);
    expect(html).not.toContain("<a ");
    expect(html).toContain("javascript:alert(1)");
  });
  it("keeps indented continuation lines inside blockquotes", () => {
    const blocks = parseCortexResponseBlocks("> **Working:**\n  Substitute the centre and radius.\n  Then simplify.");
    expect(blocks[0]).toMatchObject({ type: "quote", text: "**Working:**\nSubstitute the centre and radius.\nThen simplify." });
    const html = renderToStaticMarkup(<CortexResponse text={"> **Working:**\n  Substitute the centre and radius.\n  Then simplify."} />);
    expect((html.match(/<blockquote/g) || []).length).toBe(1);
  });

  it("preserves intentional paragraph line breaks and multi-line quotations", () => {
    const blocks = parseCortexResponseBlocks("First line\nSecond line\n\n> A quoted point\n> with its continuation");
    expect(blocks[0]).toMatchObject({ type: "paragraph", text: "First line\nSecond line" });
    expect(blocks[1]).toMatchObject({ type: "quote", text: "A quoted point\nwith its continuation" });
  });

  it("repairs provider-escaped Markdown and HTML entities in worked solutions", () => {
    const sample = String.raw`\### Part 1: Finding the Equation
\*\*Identify the values\*\*: The centre is $(-3, 2)$.
1\. \*\*Substitute the values\*\*:&#x20;
&#x20;   $(x + 3)^2 + (y - 2)^2 = 10$
2\. \*\*Simplify\*\*: The equation is ready.`;
    const blocks = parseCortexResponseBlocks(sample);
    expect(blocks[0]).toMatchObject({ type: "heading", text: "Part 1: Finding the Equation" });
    expect(blocks[1]).toMatchObject({ type: "paragraph", text: "**Identify the values**: The centre is $(-3, 2)$." });
    expect(blocks[2]).toMatchObject({ type: "list", ordered: true });
    expect(blocks[2]).toMatchObject({ items: [{ text: "**Substitute the values**: \n$(x + 3)^2 + (y - 2)^2 = 10$" }, { text: "**Simplify**: The equation is ready." }] });
  });

  it("repairs Markdown punctuation after multiple transport-escaping layers", () => {
    expect(normalizeCortexResponseText("\\\\### Part 2")).toBe("### Part 2");
    expect(normalizeCortexResponseText("\\\\*\\\\*Important\\\\*\\\\*")).toBe("**Important**");
  });

  it("leaves invalid numeric HTML entities intact instead of crashing", () => {
    expect(normalizeCortexResponseText("Invalid: &#x110000; and &#99999999;.")).toBe("Invalid: &#x110000; and &#99999999;.");
  });

;
    const display = String.raw`$
\begin{aligned}
\text{Set }&=\{1,2,3\}\\
P(A)&=\frac{1}{2}
\end{aligned}
$`;
    expect(normalizeCortexResponseText(inline)).toBe(inline);
    expect(normalizeCortexResponseText(display)).toBe(display);
    const html = renderToStaticMarkup(<CortexResponse text={inline + "\n\n" + display} />);
    expect((html.match(/class="katex/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("preserves LaTeX inline and display delimiters while unescaping Markdown", () => {
    const inline = "Use \\(\\frac{1}{2}\\) as the exact value.";
    const display = "\\[x^2 + y^2 = r^2\\]";
    expect(normalizeCortexResponseText(inline)).toBe(inline);
    expect(normalizeCortexResponseText(display)).toBe(display);
    const html = renderToStaticMarkup(<CortexResponse text={inline + "\n\n" + display} />);
    expect(html.match(/class="katex/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('role="math"');
    expect(html).toContain('class="my-3 block max-w-full overflow-x-auto');
  });

  it("renders completed and pending Markdown task items", () => {
    const source = "- [x] Identify the values\n- [ ] Check the units";
    const blocks = parseCortexResponseBlocks(source);
    expect(blocks[0]).toMatchObject({ type: "list", items: [{ text: "Identify the values", checked: true }, { text: "Check the units", checked: false }] });
    const html = renderToStaticMarkup(<CortexResponse text={source} />);
    expect(html).toContain('aria-label="Completed"');
    expect(html).toContain('aria-label="Not completed"');
  });

  it("preserves nested ordered and unordered list structure", () => {
    const blocks = parseCortexResponseBlocks("1. First step\n   - Supporting point\n   - Another point\n2. Second step\n   1. Nested calculation\n   2. Check the result");
    expect(blocks[0]).toMatchObject({
      type: "list",
      ordered: true,
      items: [
        { text: "First step", children: [{ ordered: false, items: [{ text: "Supporting point" }, { text: "Another point" }] }] },
        { text: "Second step", children: [{ ordered: true, items: [{ text: "Nested calculation" }, { text: "Check the result" }] }] },
      ],
    });
    const html = renderToStaticMarkup(<CortexResponse text={"1. First step\n   - Supporting point\n2. Second step"} />);
    expect(html).toContain("<ol");
    expect(html).toContain("<ul");
  });

  it("renders aligned multi-line working and matrices in paragraphs, lists, and tables", () => {
    const aligned = String.raw`$$
\begin{aligned}
2x + 3y &= 12 \\
x - y &= 1
\end{aligned}
$$`;
    const matrix = String.raw`\begin{pmatrix}1 & 2 \\ 3 & 4\end{pmatrix}`;
    const source = [
      "## Simultaneous equations",
      aligned,
      "1. Form the matrix " + "$" + matrix + "$",
      "",
      "| Step | Working |",
      "| --- | --- |",
      "| Determinant | $" + String.raw`ad-bc` + "$ |",
    ].join("\n");
    const html = renderToStaticMarkup(<CortexResponse text={source} />);
    expect(html).toContain("katex");
    expect(html).toContain("<ol");
    expect(html).toContain("<table");
    expect((html.match(/class="katex/g) || []).length).toBeGreaterThanOrEqual(3);
  });

  it("keeps separate display equations separate inside a long explanation", () => {
    const source = "First derive the expression.\n\n$$a^2+b^2=c^2$$\n\nThen substitute the values.\n\n$$c=\\sqrt{a^2+b^2}$$";
    const html = renderToStaticMarkup(<CortexResponse text={source} />);
    expect((html.match(/role="math"/g) || []).length).toBe(2);
    expect((html.match(/class="katex-display"/g) || []).length).toBe(2);
  });

  it("keeps currency values and unmatched dollar markers from swallowing table columns", () => {
    const source = "| Item | Cost | Note |
| --- | --- | --- |
| Book | $25 | Standard price |
| Formula | $P(A|B)$ | Conditional probability |";
    const blocks = parseCortexResponseBlocks(source);
    expect(blocks[0]).toMatchObject({
      type: "table",
      rows: [
        ["Item", "Cost", "Note"],
        ["Book", "$25", "Standard price"],
        ["Formula", "$P(A|B)$", "Conditional probability"],
      ],
    });
  });

  it("does not split table cells on pipes inside maths or inline code", () => {
    const source = "| Expression | Meaning |\n| --- | --- |\n| $P(A|B)$ | Conditional probability |\n| \`a|b\` | Inline code |";
    const blocks = parseCortexResponseBlocks(source);
    expect(blocks[0]).toMatchObject({
      type: "table",
      rows: [
        ["Expression", "Meaning"],
        ["$P(A|B)$", "Conditional probability"],
        ["\`a|b\`", "Inline code"],
      ],
    });
    const html = renderToStaticMarkup(<CortexResponse text={source} />);
    expect(html).toContain("katex");
    expect(html).toContain("Conditional probability");
  });

});