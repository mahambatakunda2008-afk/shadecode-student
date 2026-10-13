import { describe, expect, it } from "vitest";
import { sanitizeLessonText } from "./sanitizeLessonText";

describe("sanitizeLessonText", () => {
  it("removes null characters from lesson text", () => {
    expect(sanitizeLessonText("wave\u0000 motion")).toBe("wave motion");
  });

  it("sanitizes nested lesson block content without changing other text", () => {
    expect(sanitizeLessonText({
      title: "Waves",
      blocks: [{ content: "Sound\u0000 waves", formula: "v = fλ" }],
    })).toEqual({
      title: "Waves",
      blocks: [{ content: "Sound waves", formula: "v = fλ" }],
    });
  });

  it("sanitizes array values and object keys", () => {
    expect(sanitizeLessonText([{ ["bad\u0000key"]: "ok\u0000" }])).toEqual([
      { badkey: "ok" },
    ]);
  });

  it("preserves values without null characters", () => {
    const value = { title: "Wave motion", completedUnits: 2 };
    expect(sanitizeLessonText(value)).toEqual(value);
  });
});
