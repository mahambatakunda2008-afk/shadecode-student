import { describe, expect, it } from "vitest";
import { kMapCandidateGroups, kMapGroups, kMapTerm, simplifyKMap, type Bit } from "./BooleanLogicLab";

const ALL_MAPS: Bit[][] = Array.from({ length: 16 }, (_, mask) =>
  Array.from({ length: 4 }, (_, index) => ((mask >> index) & 1) as Bit),
);

const EXPECTED: Record<string, string> = {
  "0000": "0",
  "0001": "A AND NOT B",
  "0010": "A AND B",
  "0011": "A",
  "0100": "NOT A AND B",
  "0101": "NOT A AND B OR A AND NOT B",
  "0110": "B",
  "0111": "B OR A",
  "1000": "NOT A AND NOT B",
  "1001": "NOT B",
  "1010": "NOT A AND NOT B OR A AND B",
  "1011": "A OR NOT B",
  "1100": "NOT A",
  "1101": "NOT A OR NOT B",
  "1110": "NOT A OR B",
  "1111": "1",
};

describe("two-variable K-map minimization", () => {
  it("produces a deterministic SOP for every possible 4-cell map", () => {
    for (const cells of ALL_MAPS) {
      const key = cells.join("");
      expect(simplifyKMap(cells)).toBe(EXPECTED[key]);
    }
  });

  it("never emits a group containing a zero cell", () => {
    for (const cells of ALL_MAPS) {
      for (const group of kMapCandidateGroups(cells)) {
        expect(group.every(index => cells[index] === 1)).toBe(true);
      }
    }
  });

  it("finds all valid visual groups for each map", () => {
    for (const cells of ALL_MAPS) {
      const expected = kMapCandidateGroups(cells);
      expect(kMapGroups(cells).every(group => expected.some(candidate => candidate.join(",") === group.join(",")))).toBe(true);
    }
  });

  it("derives the correct literal from every valid group", () => {
    expect(kMapTerm([0])).toBe("NOT A AND NOT B");
    expect(kMapTerm([1])).toBe("NOT A AND B");
    expect(kMapTerm([2])).toBe("A AND B");
    expect(kMapTerm([3])).toBe("A AND NOT B");
    expect(kMapTerm([0, 1])).toBe("NOT A");
    expect(kMapTerm([1, 2])).toBe("B");
    expect(kMapTerm([2, 3])).toBe("A");
    expect(kMapTerm([3, 0])).toBe("NOT B");
    expect(kMapTerm([0, 1, 2, 3])).toBe("1");
  });
});
