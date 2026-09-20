import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCambridge9709Rows, CAMBRIDGE_9709_IDENTITY, canonicalRowLine } from "./cambridge-9709";

// Independent transcription of the official document's "Content overview" (syllabus p. 9) and the
// number of "Candidates should be able to" bullets under each topic in "3 Subject content" (pp. 19-39).
const OFFICIAL: Array<{ section: string; paper: string; topics: Array<[string, string, number]> }> = [
  { section: "Pure Mathematics 1", paper: "Paper 1", topics: [["1.1", "Quadratics", 5], ["1.2", "Functions", 5], ["1.3", "Coordinate geometry", 5], ["1.4", "Circular measure", 2], ["1.5", "Trigonometry", 5], ["1.6", "Series", 4], ["1.7", "Differentiation", 4], ["1.8", "Integration", 4]] },
  { section: "Pure Mathematics 2", paper: "Paper 2", topics: [["2.1", "Algebra", 3], ["2.2", "Logarithmic and exponential functions", 4], ["2.3", "Trigonometry", 2], ["2.4", "Differentiation", 3], ["2.5", "Integration", 3], ["2.6", "Numerical solution of equations", 3]] },
  { section: "Pure Mathematics 3", paper: "Paper 3", topics: [["3.1", "Algebra", 5], ["3.2", "Logarithmic and exponential functions", 4], ["3.3", "Trigonometry", 2], ["3.4", "Differentiation", 3], ["3.5", "Integration", 6], ["3.6", "Numerical solution of equations", 3], ["3.7", "Vectors", 6], ["3.8", "Differential equations", 4], ["3.9", "Complex numbers", 8]] },
  { section: "Mechanics", paper: "Paper 4", topics: [["4.1", "Forces and equilibrium", 7], ["4.2", "Kinematics of motion in a straight line", 4], ["4.3", "Momentum", 2], ["4.4", "Newton's laws of motion", 4], ["4.5", "Energy, work and power", 5]] },
  { section: "Probability & Statistics 1", paper: "Paper 5", topics: [["5.1", "Representation of data", 5], ["5.2", "Permutations and combinations", 2], ["5.3", "Probability", 4], ["5.4", "Discrete random variables", 3], ["5.5", "The normal distribution", 3]] },
  { section: "Probability & Statistics 2", paper: "Paper 6", topics: [["6.1", "The Poisson distribution", 5], ["6.2", "Linear combinations of random variables", 1], ["6.3", "Continuous random variables", 2], ["6.4", "Sampling and estimation", 8], ["6.5", "Hypothesis tests", 5]] },
];

// md5 of the canonical rows, identical to the checksum verified against the production database.
const EXPECTED_ROWS_MD5 = "f1f91d6df19e5b271c23eb9850bdab3e";

describe("Cambridge 9709 (2026-2027) curriculum data", () => {
  const rows = buildCambridge9709Rows();

  it("carries the canonical identity the resolver matches on", () => {
    expect(CAMBRIDGE_9709_IDENTITY).toMatchObject({
      boardId: "cambridge",
      qualificationId: "cambridge-as-a-level",
      syllabusId: "cambridge-9709",
      syllabusVersion: "2026-2027",
      subjectId: "mathematics",
      sourceUrl: "https://www.cambridgeinternational.org/Images/697427-2026-2027-syllabus.pdf",
    });
    expect(CAMBRIDGE_9709_IDENTITY.effectiveFrom < CAMBRIDGE_9709_IDENTITY.effectiveTo).toBe(true);
  });

  it("has the official 6 sections, 38 topics and 153 outcomes (159 rows)", () => {
    expect(rows.filter((r) => r.parent_key === null)).toHaveLength(6);
    expect(new Set(rows.filter((r) => r.topic).map((r) => r.topic)).size).toBe(38);
    expect(rows.filter((r) => r.parent_key !== null)).toHaveLength(153);
    expect(rows).toHaveLength(159);
  });

  it("matches the official section names, topic titles, topic order and outcome counts", () => {
    OFFICIAL.forEach((section, sectionIndex) => {
      const key = String(sectionIndex + 1);
      expect(rows.find((r) => r.objective_key === key)?.title).toBe(section.section);
      for (const [topicKey, title, count] of section.topics) {
        const outcomes = rows.filter((r) => r.topic === topicKey);
        expect(outcomes, `${topicKey} ${title}`).toHaveLength(count);
        expect(new Set(outcomes.map((r) => r.title))).toEqual(new Set([title]));
        expect(outcomes.every((r) => r.parent_key === key)).toBe(true);
      }
    });
  });

  it("keeps objective keys unique and sequential within each topic", () => {
    const keys = rows.map((r) => r.objective_key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const topic of new Set(rows.filter((r) => r.topic).map((r) => r.topic as string))) {
      const numbers = rows.filter((r) => r.topic === topic).map((r) => Number(r.objective_key.split(".")[2]));
      expect(numbers).toEqual(numbers.map((_, i) => i + 1));
    }
  });

  it("marks AS-only, A-Level-only and shared components correctly", () => {
    const level = (key: string) => rows.find((r) => r.objective_key === key)?.education_level;
    // Paper 2 is offered at AS only; Papers 3 and 6 at A Level only; Papers 1, 4 and 5 at both (AS foundation).
    expect([level("1"), level("2"), level("3"), level("4"), level("5"), level("6")]).toEqual(["as_level", "as_level", "a_level", "as_level", "as_level", "a_level"]);
  });

  it("has clean, non-empty statements with no stray whitespace or control characters", () => {
    for (const row of rows) {
      expect(row.description.trim(), row.objective_key).toBe(row.description);
      expect(row.description.length, row.objective_key).toBeGreaterThan(20);
      expect(row.description).not.toMatch(/[\u0000-\u001f]/);
      expect(row.description.endsWith("."), row.objective_key).toBe(true);
    }
  });

  it("matches the checksum recorded in the production database", () => {
    const md5 = createHash("md5").update(rows.map(canonicalRowLine).join("\n"), "utf8").digest("hex");
    expect(md5).toBe(EXPECTED_ROWS_MD5);
  });
});
