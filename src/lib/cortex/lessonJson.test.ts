import { describe, expect, it } from "vitest";
import { parseSectionJson } from "./lessonJson";

const block = (type: string, content: string) => ({ type, title: type, content });
const body = "Displacement is the vector change in position, so it keeps direction and magnitude together over the interval.";

describe("parseSectionJson", () => {
  it("parses a fenced section", () => {
    const raw = "```json\n" + JSON.stringify({ title: "Motion", blocks: [block("concept", body), block("example", body), block("checkpoint", body)] }) + "\n```";
    expect(parseSectionJson(raw)?.blocks).toHaveLength(3);
  });

  it("parses LaTeX backslashes that are not valid JSON escapes", () => {
    const raw = `{"title":"Vectors","blocks":[{"type":"concept","content":"The vector \\Delta x = x_f - x_i and \\vec{v} describe motion along a straight line over time."},{"type":"example","content":"${body}"},{"type":"checkpoint","content":"${body}"}]}`;
    expect(() => JSON.parse(raw)).toThrow();
    const parsed = parseSectionJson(raw);
    expect(parsed?.title).toBe("Vectors");
    expect(parsed?.blocks).toHaveLength(3);
  });

  it("rejects sections with fewer than three substantive blocks", () => {
    const raw = JSON.stringify({ title: "Thin", blocks: [block("concept", body), block("example", "too short")] });
    expect(parseSectionJson(raw)).toBeNull();
  });
});
