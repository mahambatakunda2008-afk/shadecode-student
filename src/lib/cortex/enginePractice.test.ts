import { describe, expect, it } from "vitest";
import { buildEnginePracticeBlocks, hasEnginePractice, tidyAlgebra, tidyAnswer } from "./enginePractice";

describe("tidyAnswer", () => {
  it("removes pointless trailing zeros and bare decimal points", () => {
    expect(tidyAnswer("28.000000")).toBe("28");
    expect(tidyAnswer("1.50")).toBe("1.5");
  });
  it("leaves real values and units alone", () => {
    expect(tidyAnswer("1.33 ohm")).toBe("1.33 ohm");
    expect(tidyAnswer("0.333 mol dm-3")).toBe("0.333 mol dm-3");
    expect(tidyAnswer("100")).toBe("100");
    expect(tidyAnswer("0.05")).toBe("0.05");
  });
});

describe("tidyAlgebra", () => {
  it("drops a lone coefficient of 1 but never touches real numbers", () => {
    expect(tidyAlgebra("x² - 1x = 0")).toBe("x² - x = 0");
    expect(tidyAlgebra("1x + 3y = 0 and 4x + 1y = -4")).toBe("x + 3y = 0 and 4x + y = -4");
    expect(tidyAlgebra("11x + 21y and 10x and x1")).toBe("11x + 21y and 10x and x1");
    expect(tidyAlgebra("Solve 1 mol of gas, 1 m and 1 s")).toBe("Solve 1 mol of gas, 1 m and 1 s");
  });
});

describe("buildEnginePracticeBlocks", () => {
  const cases: Array<[string, string]> = [["Physics", "Ohm's law and resistance"], ["Mathematics", "Quadratic equations"], ["Chemistry", "Moles"]];

  it("reports whether the engine covers a topic", () => {
    expect(hasEnginePractice("Mathematics", "Quadratic equations")).toBe(true);
    expect(hasEnginePractice("History", "The Cold War")).toBe(false);
    expect(buildEnginePracticeBlocks("History", "The Cold War")).toBeNull();
  });

  for (const [subject, topic] of cases) {
    it(`builds worked examples, practice and common mistakes for ${subject}: ${topic}`, () => {
      const result = buildEnginePracticeBlocks(subject, topic, 7)!;
      expect(result).not.toBeNull();
      const types = result.blocks.map((b) => b.type);
      expect(types.filter((t) => t === "example")).toHaveLength(3);
      expect(types.filter((t) => t === "practice")).toHaveLength(3);
      expect(types).toContain("misconception");
      expect(types.at(-1)).toBe("exam");
      expect(result.blocks.length).toBeGreaterThanOrEqual(8);
      for (const b of result.blocks) expect(b.content.trim().length, b.title).toBeGreaterThanOrEqual(40);
    });
  }

  it("shows working and a clean answer in each worked example", () => {
    const ex = buildEnginePracticeBlocks("Mathematics", "Quadratic equations", 7)!.blocks.find((b) => b.type === "example")!;
    expect(ex.content).toMatch(/Working:\n1\. /);
    expect(ex.content).toMatch(/Answer: /);
    expect(ex.content).not.toMatch(/\.0{3,}/);
  });

  it("puts answers after the practice questions, not before", () => {
    const set = buildEnginePracticeBlocks("Physics", "Ohm's law and resistance", 7)!.blocks.find((b) => b.type === "practice")!;
    expect(set.content.indexOf("1. ")).toBeLessThan(set.content.indexOf("Answers (check after"));
  });

  it("cleans algebra in maths lessons only", () => {
    const text = (subject: string, topic: string) => buildEnginePracticeBlocks(subject, topic, 7)!.blocks.map((b) => b.content).join("\n");
    expect(text("Mathematics", "Quadratic equations")).not.toMatch(/(^|[\s(+\-=])1[xyz]\b/m);
  });

  it("is deterministic for a given seed and varies across seeds", () => {
    const a = buildEnginePracticeBlocks("Physics", "Ohm's law and resistance", 3)!;
    const b = buildEnginePracticeBlocks("Physics", "Ohm's law and resistance", 3)!;
    const c = buildEnginePracticeBlocks("Physics", "Ohm's law and resistance", 99)!;
    expect(a.blocks).toEqual(b.blocks);
    expect(JSON.stringify(a.blocks)).not.toBe(JSON.stringify(c.blocks));
  });

  it("explains the classic mistakes in words, not just numbers", () => {
    const m = buildEnginePracticeBlocks("Physics", "Ohm's law and resistance", 7)!.blocks.find((b) => b.type === "misconception")!;
    expect(m.content).toMatch(/\d\. [A-Z]/);
    expect(m.content.length).toBeGreaterThan(80);
  });
});
