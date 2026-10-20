import { describe, expect, it } from "vitest";
import { sanitizeLessonText } from "./sanitizeLessonText";

describe("sanitizeLessonText", () => {
  it("removes PostgreSQL-forbidden null characters from nested lesson payloads", () => {
    const input = {
      title: "Wave\u0000s",
      blocks: [
        { type: "concept", content: "Energy\u0000 transfer", metadata: { note: "safe\u0000 text" } },
      ],
      "bad\u0000key": "value",
    };

    expect(sanitizeLessonText(input)).toEqual({
      title: "Waves",
      blocks: [
        { type: "concept", content: "Energy transfer", metadata: { note: "safe text" } },
      ],
      badkey: "value",
    });
  });

  it("sanitizes standalone strings and preserves valid Unicode, whitespace, and punctuation", () => {
    expect(sanitizeLessonText("Wave\u0000s\nλ = v / f; Ω remains.")).toBe("Waves\nλ = v / f; Ω remains.");
  });

  it("preserves valid content and primitive values", () => {
    expect(sanitizeLessonText({ title: "Waves", count: 4, enabled: true, empty: null })).toEqual({
      title: "Waves", count: 4, enabled: true, empty: null,
    });
  });

  it("sanitizes strings inside arrays without mutating the original payload", () => {
    const input = { blocks: [{ content: "before\u0000after" }], labels: ["plain", "a\u0000b"] };
    const result = sanitizeLessonText(input);

    expect(result).toEqual({ blocks: [{ content: "beforeafter" }], labels: ["plain", "ab"] });
    expect(input.blocks[0].content).toBe("before\u0000after");
    expect(input.labels[1]).toBe("a\u0000b");
    expect(result).not.toBe(input);
  });

  it("removes null characters from a plain string", () => {
    expect(sanitizeLessonText("wave\u0000 motion")).toBe("wave motion");
  });

  it("keeps formulas and non-ASCII text intact while cleaning block content", () => {
    expect(sanitizeLessonText({ title: "Waves", blocks: [{ content: "Sound\u0000 waves", formula: "v = fλ" }] })).toEqual({
      title: "Waves",
      blocks: [{ content: "Sound waves", formula: "v = fλ" }],
    });
  });

  it("cleans object keys inside arrays", () => {
    expect(sanitizeLessonText([{ ["bad\u0000key"]: "ok\u0000" }])).toEqual([{ badkey: "ok" }]);
  });
});
