import { describe, expect, it } from "vitest";
import { buildOfflineCurriculumScope, type OfflineCurriculumPack } from "./offlineCurriculumPack";

const basePack: OfflineCurriculumPack = {
  version: 2,
  subject: "Physics",
  board: "Cambridge International",
  level: "AS Level",
  syllabusId: "9702",
  syllabusVersion: "2022",
  objectives: [{ code: "2.1", statement: "Understand acceleration as rate of change of velocity" }],
  knowledge: [{ id: "acceleration-1", kind: "explanation", title: "Acceleration", content: "Acceleration is change in velocity per unit time." }],
  cachedAt: "2026-10-29T00:00:00.000Z",
};

describe("buildOfflineCurriculumScope provenance", () => {
  it("treats legacy packs without provenance as unreviewed", () => {
    const context = buildOfflineCurriculumScope(basePack, "acceleration");
    expect(context).toContain("Verification status: unreviewed");
    expect(context).toContain("UNREVIEWED");
    expect(context).not.toContain("Verification status: verified");
  });

  it("includes source details and does not confuse syllabus mapping with content review", () => {
    const context = buildOfflineCurriculumScope({
      ...basePack,
      provenance: {
        status: "syllabus-mapped",
        sourceTitle: "Physics for Cambridge International AS & A Level Coursebook",
        sourceEdition: "2022 syllabus coverage",
        syllabusAuthority: "Cambridge International",
        syllabusYear: "2022",
      },
    }, "acceleration");
    expect(context).toContain("Verification status: syllabus-mapped");
    expect(context).toContain("Physics for Cambridge International AS & A Level Coursebook");
    expect(context).toContain("independent content checking is not confirmed");
  });

  it("only describes verified packs as verified when that status is explicitly supplied", () => {
    const context = buildOfflineCurriculumScope({
      ...basePack,
      provenance: { status: "verified", reviewer: "Independent reviewer", reviewedAt: "2026-10-29" },
    }, "acceleration");
    expect(context).toContain("Verification status: verified");
    expect(context).toContain("Independent reviewer");
    expect(context).toContain("exact syllabus mapping have been completed");
  });

  it("returns no curriculum context when no pack is available", () => {
    expect(buildOfflineCurriculumScope(null, "acceleration")).toBe("");
  });
});
