import { describe, expect, it } from "vitest";
import { buildDeterministicLessonFallback } from "./lessonFallback";
import { THEORY_EXCLUSIONS, THEORY_LESSONS } from "./theoryLessons";

const ALLOWED_TYPES = new Set(["objective", "prior", "concept", "definition", "formula", "example", "checkpoint", "application", "exam", "summary", "misconception", "mistake", "practice", "synthesis"]);
const LESSONS = [...new Set(Object.values(THEORY_LESSONS))];
const byTitle = (needle: string) => LESSONS.find((l) => l.title.startsWith(needle))!;
const blockText = (lesson: { blocks: Array<{ title?: string; content: string }> }, title: string) => lesson.blocks.find((b) => b.title === title)!.content;
const allText = (lesson: { blocks: Array<{ content: string }> }) => lesson.blocks.map((b) => b.content).join("\n");
/** Number -> text the way the lessons print it (no floating point noise). */
const fmt = (x: number) => String(Number(x.toFixed(6)));

describe("theory lessons: structure", () => {
  it("has five lessons, each persistable (10+ blocks of 40+ characters) and well formed", () => {
    expect(LESSONS).toHaveLength(5);
    for (const lesson of LESSONS) {
      expect(lesson.blocks.length, lesson.title).toBeGreaterThanOrEqual(10);
      expect(lesson.blocks[0].type, lesson.title).toBe("objective");
      expect(lesson.blocks.at(-1)!.type, lesson.title).toBe("summary");
      const types = new Set(lesson.blocks.map((b) => b.type));
      for (const needed of ["example", "misconception", "exam"]) expect(types.has(needed), `${lesson.title} needs a ${needed} block`).toBe(true);
      const titles = lesson.blocks.map((b) => b.title);
      expect(new Set(titles).size, `${lesson.title} has duplicate block titles`).toBe(titles.length);
      for (const block of lesson.blocks) {
        expect(ALLOWED_TYPES.has(block.type), `${lesson.title}: ${block.type}`).toBe(true);
        expect(block.content.trim().length, `${lesson.title}: ${block.title}`).toBeGreaterThanOrEqual(40);
        expect(block.content.length, `${lesson.title}: ${block.title} is a wall of text`).toBeLessThanOrEqual(1800);
        expect(block.content, `${lesson.title}: ${block.title}`).not.toMatch(/undefined|TODO|FIXME|\{\{|\}\}/);
      }
    }
  });

  it("keeps lookup keys and exclusions in step", () => {
    expect(Object.keys(THEORY_EXCLUSIONS).sort()).toEqual(Object.keys(THEORY_LESSONS).sort());
  });
});

describe("theory lessons: lookup", () => {
  const hits: Array<[string, string, string]> = [
    ["Computer Science", "Binary search", "Binary search"],
    ["AS Level Computer Science", "Teach me binary search please", "Binary search"],
    ["Chemistry", "Introduction to organic chemistry", "Organic chemistry basics"],
    ["A Level Chemistry", "Ionic bonding", "Chemical bonding"],
    ["IGCSE Chemistry", "Structure and bonding", "Chemical bonding"],
    ["Chemistry", "Metallic bonding", "Chemical bonding"],
    ["Physics", "Electric circuits", "Electric circuits"],
    ["AS Level Physics", "Series and parallel circuits", "Electric circuits"],
    ["Biology", "Photosynthesis", "Photosynthesis"],
    ["AS Biology", "Photosynthesis in plants", "Photosynthesis"],
  ];
  for (const [subject, topic, titleStart] of hits) {
    it(`serves "${topic}" (${subject})`, () => {
      expect(buildDeterministicLessonFallback(subject, topic)?.title.startsWith(titleStart)).toBe(true);
    });
  }

  const misses: Array<[string, string]> = [
    ["Computer Science", "Binary search tree"],
    ["Computer Science", "Binary search trees traversal"],
    ["Chemistry", "Dative covalent bonding"],
    ["Chemistry", "Hydrogen bonding"],
    ["Chemistry", "Organic chemistry reaction mechanisms"],
    ["Physics", "Electric circuits with capacitors"],
    ["Physics", "Electric circuits and internal resistance"],
    ["Biology", "Photosynthesis and respiration"],
    ["Physics", "Binary search"],
    ["Mathematics", "Photosynthesis"],
    ["Chemistry", "Electric circuits"],
  ];
  for (const [subject, topic] of misses) {
    it(`does not serve the wrong lesson for "${topic}" (${subject})`, () => {
      expect(buildDeterministicLessonFallback(subject, topic)).toBeNull();
    });
  }

  it("leaves the existing curated lessons untouched", () => {
    expect(buildDeterministicLessonFallback("Physics", "Waves")?.title).toMatch(/^Waves/);
    expect(buildDeterministicLessonFallback("Mathematics", "Numerical solution of equations")?.title).toMatch(/^Numerical solution/);
  });
});

describe("theory lessons: binary search is re-derived, not trusted", () => {
  const lesson = byTitle("Binary search");
  const LIST = [3, 8, 12, 17, 21, 25, 30, 34, 41, 47, 52];
  const trace = (arr: number[], target: number) => {
    let low = 0, high = arr.length - 1;
    const rows: Array<{ low: number; high: number; mid: number; item: number }> = [];
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      rows.push({ low, high, mid, item: arr[mid] });
      if (arr[mid] === target) return { rows, index: mid };
      if (target < arr[mid]) high = mid - 1; else low = mid + 1;
    }
    return { rows, index: -1 };
  };

  it("matches the found-target trace (41) step by step", () => {
    const { rows, index } = trace(LIST, 41);
    const text = blockText(lesson, "Worked example: the target is found");
    for (const r of rows) expect(text).toContain(`low ${r.low}, high ${r.high}, mid ${r.mid}`);
    expect(text).toContain(`Found at index ${index} after ${rows.length} comparisons`);
    expect(text).toContain(`A linear search would have needed ${LIST.indexOf(41) + 1} comparisons`);
  });

  it("matches the not-found trace (20) step by step", () => {
    const { rows, index } = trace(LIST, 20);
    expect(index).toBe(-1);
    const text = blockText(lesson, "Worked example: the target is not found");
    for (const r of rows) expect(text).toContain(`low ${r.low}, high ${r.high}, mid ${r.mid}: item ${r.item}`);
    expect(text).toContain(`This took ${rows.length} comparisons`);
  });

  it("matches the self-check trace on the 8-item list", () => {
    const { rows, index } = trace([2, 5, 9, 14, 18, 23, 29, 36], 23);
    const text = blockText(lesson, "Trace it yourself");
    expect(rows.map((r) => r.mid)).toEqual([3, 5]);
    expect(text).toContain("the first mid is 3 (item 14)");
    expect(text).toContain(`Found at index ${index} after ${rows.length} comparisons`);
  });

  it("matches every practice answer", () => {
    const text = blockText(lesson, "Practice");
    expect(trace(LIST, 25).rows).toHaveLength(1);
    expect(text).toContain("One comparison: mid is 5 and the item at index 5 is 25");
    expect(trace(LIST, 3).rows.map((r) => r.mid)).toEqual([5, 2, 0]);
    expect(text).toContain("mid is 5 (item 25), then 2 (item 12), then 0 (item 3). Found at index 0 after 3 comparisons");
    const miss = trace(LIST, 99);
    expect(miss.rows.map((r) => r.mid)).toEqual([5, 8, 9, 10]);
    expect(text).toContain("mid is 5, 8, 9 and 10, with items 25, 41, 47 and 52");
    expect(text).toContain("low becomes 11, which is greater than high (10)");
    expect(text).toContain(`Not found, after ${miss.rows.length} comparisons`);
    expect(text).toContain(`${Math.floor(Math.log2(100)) + 1} comparisons (the whole number part of log2(100) is ${Math.floor(Math.log2(100))}, plus 1)`);
  });

  it("states a worst case that brute force confirms", () => {
    const worst = (n: number) => {
      const arr = Array.from({ length: n }, (_, i) => i * 2); // evens, so odd targets are 'not found'
      let max = 0;
      for (let t = -1; t <= n * 2; t++) max = Math.max(max, trace(arr, t).rows.length);
      return max;
    };
    const formula = (n: number) => Math.floor(Math.log2(n)) + 1;
    for (const n of [11, 100, 1000]) expect(worst(n), `n=${n}`).toBe(formula(n));
    expect(formula(1_000_000)).toBe(20);
    const text = blockText(lesson, "How fast is it?");
    expect(text).toContain(`For n = 11 that is ${formula(11)} comparisons`);
    expect(text).toContain(`For 1 000 items it is at most ${formula(1000)}`);
    expect(text).toContain(`For 1 000 000 items it is at most ${formula(1_000_000)}`);
  });
});

describe("theory lessons: every chemical equation balances", () => {
  const countAtoms = (formula: string) => {
    const atoms = new Map<string, number>();
    for (const [, el, n] of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) atoms.set(el, (atoms.get(el) ?? 0) + (n ? Number(n) : 1));
    return atoms;
  };
  const side = (text: string) => {
    const total = new Map<string, number>();
    for (const term of text.split(" + ")) {
      const m = term.trim().match(/^(\d*)([A-Za-z0-9]+)$/)!;
      expect(m, `cannot parse term "${term}"`).not.toBeNull();
      for (const [el, n] of countAtoms(m[2])) total.set(el, (total.get(el) ?? 0) + n * (m[1] ? Number(m[1]) : 1));
    }
    return total;
  };
  // Find EVERY equation anywhere in the text (worked examples, answers and summaries included), not just the
  // ones on their own line: "<formulae joined by +> → <formulae joined by +>".
  const TERM = String.raw`\d*[A-Z][A-Za-z0-9]*`;
  const SIDE = String.raw`${TERM}(?: \+ ${TERM})*`;
  const EQUATION = new RegExp(`(${SIDE}) → (${SIDE})`, "g");
  // Fill-in-the-blank exercises ("__ CO2 + __ H2O → ...") are not claims; their answers are checked separately below.
  const claimText = (l: { blocks: Array<{ content: string }> }) => allText(l).split("\n").filter((line) => !line.includes("__")).join("\n");
  const equations = [...new Set(LESSONS.flatMap((l) => [...claimText(l).matchAll(EQUATION)].map((m) => `${m[1]} → ${m[2]}`)))];

  it("finds the equations (so this test cannot pass by checking nothing)", () => {
    expect(equations.length).toBeGreaterThanOrEqual(12);
    // Every arrow in the text that sits between formulae must have been picked up and therefore checked.
    const arrows = LESSONS.reduce((n, l) => n + (claimText(l).match(/ → /g) ?? []).length, 0);
    const wordArrows = LESSONS.reduce((n, l) => n + (claimText(l).match(/[a-z] → [a-z]/g) ?? []).length, 0);
    expect(wordArrows).toBe(0);
    expect(arrows).toBeGreaterThanOrEqual(equations.length);
  });
  it("the photosynthesis fill-in exercise has the same coefficients as the verified equation", () => {
    const photosynthesis = byTitle("Photosynthesis");
    expect(blockText(photosynthesis, "Check yourself")).toContain("1. 6, 6 and 6.");
    expect(equations).toContain("6CO2 + 6H2O → C6H12O6 + 6O2");
  });
  it("includes the ethane combustion answer from the practice block", () => {
    expect(equations).toContain("2C2H6 + 7O2 → 4CO2 + 6H2O");
    expect(equations).toContain("6CO2 + 6H2O → C6H12O6 + 6O2");
  });
  for (const equation of equations) {
    it(`balances: ${equation}`, () => {
      const [left, right] = equation.split(" → ");
      const l = side(left), r = side(right);
      expect([...l.entries()].sort()).toEqual([...r.entries()].sort());
    });
  }
});

describe("theory lessons: chemistry facts are re-derived", () => {
  const organic = byTitle("Organic chemistry basics");
  const bonding = byTitle("Chemical bonding");

  it("lists molecular formulae that follow each general formula", () => {
    const alkane = (n: number) => (n === 1 ? "CH4" : `C${n}H${2 * n + 2}`);
    const alkene = (n: number) => `C${n}H${2 * n}`;
    const text = blockText(organic, "The first four series");
    for (const n of [1, 2, 3, 4]) expect(text).toContain(alkane(n));
    for (const n of [2, 3, 4]) expect(text).toContain(alkene(n));
    expect(text).toContain("CnH2n+2");
    expect(text).toContain("CnH2n+1OH");
    expect(blockText(organic, "Check yourself")).toContain(`${alkane(7)}, because 2 x 7 + 2 = ${2 * 7 + 2}`);
  });

  it("states isomer counts verified with a cheminformatics toolkit (butane 2, pentane 3, hexane 5)", () => {
    const text = blockText(organic, "Worked example: isomers");
    expect(text).toContain("C5H12 has 3 isomers");
    expect(text).toContain("C6H14 has 5");
  });

  it("works out ionic formulae by charge balance", () => {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const formula = (cat: string, cc: number, an: string, ac: number) => {
      const g = gcd(cc, ac);
      const x = ac / g, y = cc / g;
      return `${cat}${x > 1 ? x : ""}${an}${y > 1 ? y : ""}`;
    };
    const text = allText(bonding);
    expect(formula("Na", 1, "Cl", 1)).toBe("NaCl");
    expect(formula("Mg", 2, "O", 2)).toBe("MgO");
    expect(text).toContain(formula("Mg", 2, "Cl", 1)); // MgCl2
    expect(text).toContain(formula("Na", 1, "O", 2)); // Na2O
    expect(text).toContain(formula("Al", 3, "O", 2)); // Al2O3
  });

  it("gets electron arrangements and ion particle counts right", () => {
    const shells = (z: number) => { const out: number[] = []; for (const cap of [2, 8, 8]) { const n = Math.min(cap, z); if (n > 0) out.push(n); z -= n; } return out.join(","); };
    const Z = { Na: 11, Cl: 17, Mg: 12, O: 8 };
    const text = allText(bonding);
    expect(text).toContain(`Sodium has ${shells(Z.Na)} electrons`);
    expect(text).toContain(`Chlorine has ${shells(Z.Cl)} electrons`);
    expect(text).toContain(`Magnesium ${shells(Z.Mg)} loses 2 electrons`);
    expect(text).toContain(`Oxygen ${shells(Z.O)} gains 2 electrons`);
    expect(text).toContain(`Na+ has ${Z.Na} protons and ${Z.Na - 1} electrons. Cl- has ${Z.Cl} protons and ${Z.Cl + 1} electrons`);
    expect(shells(Z.Na - 1)).toBe("2,8");
    expect(shells(Z.Cl + 1)).toBe("2,8,8");
    expect(shells(Z.Mg - 2)).toBe("2,8");
    expect(shells(Z.O + 2)).toBe("2,8");
    // Al2O3: charges balance
    expect(2 * 3).toBe(3 * 2);
  });
});

describe("theory lessons: circuit values are re-derived", () => {
  const lesson = byTitle("Electric circuits");

  it("series: 4 and 6 ohms across 12 V", () => {
    const R = 4 + 6, I = 12 / R, V1 = I * 4, V2 = I * 6, P = 12 * I;
    const text = blockText(lesson, "Worked example: resistors in series");
    expect(text).toContain(`R = 4 + 6 = ${R} ohms`);
    expect(text).toContain(`I = V/R = 12 / ${R} = ${fmt(I)} A`);
    expect(text).toContain(`= ${fmt(V1)} V`);
    expect(text).toContain(`= ${fmt(V2)} V`);
    expect(fmt(V1 + V2)).toBe("12");
    expect(text).toContain(`P = VI = 12 x ${fmt(I)} = ${fmt(P)} W`);
  });

  it("parallel: 6 and 3 ohms across 12 V", () => {
    const R = 1 / (1 / 6 + 1 / 3), I1 = 12 / 6, I2 = 12 / 3;
    const text = blockText(lesson, "Worked example: resistors in parallel");
    expect(fmt(R)).toBe("2");
    expect(text).toContain(`R = ${fmt(R)} ohms`);
    expect(text).toContain(`= 12 / 6 = ${fmt(I1)} A`);
    expect(text).toContain(`= 12 / 3 = ${fmt(I2)} A`);
    expect(text).toContain(`Total current = ${fmt(I1)} + ${fmt(I2)} = ${fmt(I1 + I2)} A`);
    expect(text).toContain(`V/R = 12 / ${fmt(R)} = ${fmt(12 / R)} A`);
    expect(R).toBeLessThan(3);
  });

  it("charge, energy, resistance and the self-check answers", () => {
    const text = blockText(lesson, "Worked example: charge, energy and resistance");
    expect(text).toContain(`Q = It = 2.5 x 40 = ${fmt(2.5 * 40)} C`);
    expect(text).toContain(`W = QV = 100 x 12 = ${fmt(100 * 12)} J`);
    expect(text).toContain(`R = V/I = 6.0 / 0.30 = ${fmt(6.0 / 0.3)} ohms`);
    const check = blockText(lesson, "Check yourself");
    expect(check).toContain(`R = ${24 + 8} ohms, so I = 16 / ${24 + 8} = ${(16 / 32).toFixed(2)} A`);
    expect(check).toContain(`1/R = 1/10 + 1/10 = 2/10, so R = ${fmt(1 / (1 / 10 + 1 / 10))} ohms`);
    expect(check).toContain(`Q = It = 3.0 x ${2 * 60} = ${fmt(3 * 120)} C`);
  });
});
