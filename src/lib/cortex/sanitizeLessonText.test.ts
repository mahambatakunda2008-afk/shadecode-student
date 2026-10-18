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

  it("preserves valid content and primitive values", () => {
    expect(sanitizeLessonText({ title: "Waves", count: 4, enabled: true, empty: null })).toEqual({
      title: "Waves", count: 4, enabled: true, empty: null,
    });
  });
});
