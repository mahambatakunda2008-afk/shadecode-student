import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCambridge9709Rows } from "./cambridge-9709";
import { buildCambridge9709KnowledgeRows, canonicalKnowledgeLine, type KnowledgeLevel } from "./cambridge-9709-knowledge";

// The resolver's required knowledge kinds (resolver.ts REQUIRED_KNOWLEDGE_KINDS).
const REQUIRED_KINDS = ["topic", "content_scope", "competency", "skill", "progression", "assessment_requirement", "paper_component", "assessment_weighting", "examination_format", "practical_activity", "project_requirement", "terminology", "constraint", "guidance", "resource"];
// Official structure (syllabus pp. 10-16): AS Level studies Papers 1, 2, 4, 5; A Level studies Papers 1, 3, 4, 5, 6.
const SECTIONS_BY_LEVEL: Record<KnowledgeLevel, string[]> = { as_level: ["1", "2", "4", "5"], a_level: ["1", "3", "4", "5", "6"] };
// md5 of the canonical rows, identical to the checksum verified against the production database.
const EXPECTED_ROWS_MD5 = "a8b1d15beeb28cb1cfe7f44c1f760bf7";

describe("Cambridge 9709 knowledge layer", () => {
  const rows = buildCambridge9709KnowledgeRows();
  const levelRows = (level: KnowledgeLevel) => rows.filter((r) => r.level === level);

  it("covers all 15 required knowledge kinds at both levels", () => {
    for (const level of ["as_level", "a_level"] as const) {
      const kinds = new Set(levelRows(level).map((r) => r.kind));
      for (const kind of REQUIRED_KINDS) expect(kinds.has(kind), `${level} ${kind}`).toBe(true);
    }
  });

  it("has unique keys within each level and non-empty content", () => {
    for (const level of ["as_level", "a_level"] as const) {
      const keys = levelRows(level).map((r) => r.key);
      expect(new Set(keys).size, level).toBe(keys.length);
    }
    for (const row of rows) {
      expect(row.title.trim().length, row.key).toBeGreaterThan(0);
      expect(row.content.trim().length, row.key).toBeGreaterThan(20);
      expect(row.content.trim(), row.key).toBe(row.content);
    }
  });

  it("references every objective outcome for the level's components exactly once, and no others", () => {
    const outcomes = buildCambridge9709Rows().filter((r) => r.parent_key !== null);
    for (const level of ["as_level", "a_level"] as const) {
      const expected = outcomes.filter((r) => SECTIONS_BY_LEVEL[level].includes(r.parent_key as string)).map((r) => r.objective_key).sort();
      const referenced = levelRows(level).filter((r) => r.kind === "content_scope").flatMap((r) => r.objectiveKeys).sort();
      expect(referenced, level).toEqual(expected);
    }
  });

  it("scopes each level to its own components (AS never sees Papers 3 or 6; A Level never sees Paper 2)", () => {
    const mentions = (level: KnowledgeLevel, needle: RegExp) => levelRows(level).some((r) => needle.test(`${r.key} ${r.topicKey ?? ""} ${r.paperComponentId ?? ""}`));
    expect(mentions("as_level", /9709\.(topic|scope)\.[36]\b|pure-mathematics-3|probability-and-statistics-2|paper-[36]$/)).toBe(false);
    expect(mentions("a_level", /9709\.(topic|scope)\.2\b|pure-mathematics-2|paper-2$/)).toBe(false);
    expect(levelRows("as_level").filter((r) => r.kind === "paper_component").map((r) => r.paperComponentId)).toEqual(["paper-1", "paper-2", "paper-4", "paper-5"]);
    expect(levelRows("a_level").filter((r) => r.kind === "paper_component").map((r) => r.paperComponentId)).toEqual(["paper-1", "paper-3", "paper-4", "paper-5", "paper-6"]);
  });

  it("records the official paper weightings; every route sums to 100%", () => {
    const paper = (level: KnowledgeLevel, n: number) => levelRows(level).find((r) => r.key === `9709.paper.${n}`)!;
    const asWeight = (n: number) => Number(paper("as_level", n).metadata.weightingPercentAS);
    const aWeight = (n: number) => Number(paper("a_level", n).metadata.weightingPercentA);
    expect(asWeight(1) + asWeight(2)).toBe(100); // Pure only
    expect(asWeight(1) + asWeight(4)).toBe(100); // Pure + Mechanics
    expect(asWeight(1) + asWeight(5)).toBe(100); // Pure + Probability & Statistics
    expect(aWeight(1) + aWeight(3) + aWeight(4) + aWeight(5)).toBe(100);
    expect(aWeight(1) + aWeight(3) + aWeight(5) + aWeight(6)).toBe(100);
    expect(paper("a_level", 1).metadata).toMatchObject({ marks: 75, durationMinutes: 110 });
    expect(paper("a_level", 6).metadata).toMatchObject({ marks: 50, durationMinutes: 75 });
  });

  it("keeps the syllabus's explicit scope exclusions", () => {
    const scope = (key: string, level: KnowledgeLevel = "a_level") => levelRows(level).find((r) => r.key === key)!.content;
    expect(scope("9709.scope.1.3")).toContain("Implicit differentiation is not included");
    expect(scope("9709.scope.1.7")).toContain("points of inflexion are not required");
    expect(scope("9709.scope.4.3")).toContain("Impulse and the coefficient of restitution are not required");
    expect(scope("9709.scope.3.7")).toContain("vector product are not required");
    expect(scope("9709.scope.5.2")).toContain("Arrangements in a circle are not included");
    expect(scope("9709.scope.6.3")).toContain("cumulative distribution function is not included");
    expect(scope("9709.scope.2.5", "as_level")).toContain("integration by substitution is not required");
  });

  it("uses level-specific text where the levels differ", () => {
    const routes = (level: KnowledgeLevel) => levelRows(level).find((r) => r.key === "9709.assessment.routes")!.content;
    expect(routes("as_level")).toContain("cannot count towards A Level");
    expect(routes("a_level")).toContain("Paper 4 and Paper 6 cannot be combined");
    const ao = (level: KnowledgeLevel) => levelRows(level).find((r) => r.key === "9709.weighting.ao")!.content;
    expect(ao("as_level")).toContain("55 percent");
    expect(ao("a_level")).toContain("52 percent");
  });

  it("records the absence of practical and project components explicitly", () => {
    for (const level of ["as_level", "a_level"] as const) {
      expect(levelRows(level).find((r) => r.kind === "practical_activity")!.metadata).toMatchObject({ applicability: "not_applicable" });
      expect(levelRows(level).find((r) => r.kind === "project_requirement")!.metadata).toMatchObject({ applicability: "not_applicable" });
    }
  });

  it("matches the checksum recorded in the production database", () => {
    const md5 = createHash("md5").update(rows.map(canonicalKnowledgeLine).join("\n"), "utf8").digest("hex");
    expect(md5).toBe(EXPECTED_ROWS_MD5);
  });
});
