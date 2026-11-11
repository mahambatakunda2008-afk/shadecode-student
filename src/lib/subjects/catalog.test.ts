import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUBJECT_CATALOG, SUBJECT_CATEGORIES, canonicalSubjectId, canonicalSubjectName, getSubjectReadiness, resolveSubjectCatalogEntry } from "./catalog";

describe("central subject catalogue", () => {
  it("has unique stable IDs and unique canonical names", () => {
    const ids = SUBJECT_CATALOG.map(subject => subject.id);
    const names = SUBJECT_CATALOG.map(subject => subject.name.toLocaleLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("covers the expected subject families and learner pathways", () => {
    expect(SUBJECT_CATEGORIES).toHaveLength(7);
    for (const name of ["Mathematics", "Physics", "Geography", "Shona", "Computer Science", "Accounting", "Art and Design", "Nursing"]) {
      expect(SUBJECT_CATALOG.some(subject => subject.name === name)).toBe(true);
    }
    const pathways = new Set(SUBJECT_CATALOG.flatMap(subject => subject.pathways));
    for (const pathway of ["early-childhood", "primary", "lower-secondary", "upper-secondary", "a-level", "university", "tvet", "professional", "independent"]) {
      expect(pathways.has(pathway)).toBe(true);
    }
  });

  it("supports canonical aliases without requiring duplicate catalogue entries", () => {
    expect(SUBJECT_CATALOG.find(subject => subject.name === "Mathematics")?.aliases).toContain("Maths");
    expect(SUBJECT_CATALOG.find(subject => subject.name === "English Language")?.aliases).toContain("English");
    expect(SUBJECT_CATALOG.find(subject => subject.name === "Integrated Science")?.aliases).toContain("Science");
  });

  it("reports only evidence-backed subject readiness and leaves unknown layers unverified", () => {
    const frs = SUBJECT_CATALOG.find(subject => subject.id === "zimsec-family-religious-studies-o-level")!;
    const readiness = getSubjectReadiness(frs, 2);
    expect(readiness.find(item => item.id === "catalogue")?.state).toBe("ready");
    expect(readiness.find(item => item.id === "curriculum")?.detail).toContain("4047");
    expect(readiness.find(item => item.id === "content")?.detail).toBe("2 saved lessons in your library");
    expect(readiness.filter(item => ["assessment", "tools", "offline"].includes(item.id)).every(item => item.state === "not_verified")).toBe(true);
    const unmapped = getSubjectReadiness(null, 0);
    expect(unmapped.find(item => item.id === "curriculum")?.state).toBe("needs_setup");
    expect(unmapped.find(item => item.id === "content")?.state).toBe("needs_setup");
  });

  it("keeps selectable status separate from claims about verified curriculum or content", () => {
    expect(SUBJECT_CATALOG.every(subject => !("verified" in subject) && !("lessonCount" in subject))).toBe(true);
  });
  it("resolves stable IDs, display names and aliases to one subject identity", () => {
    expect(canonicalSubjectId("Maths")).toBe("mathematics");
    expect(canonicalSubjectId("mathematics")).toBe("mathematics");
    expect(canonicalSubjectId("English")).toBe("english-language");
    expect(canonicalSubjectId("english-language")).toBe("english-language");
    expect(canonicalSubjectName("art-design")).toBe("Art and Design");
    expect(resolveSubjectCatalogEntry("Information and Communication Technology")?.id).toBe("ict");
    expect(resolveSubjectCatalogEntry("FRS")?.id).toBe("zimsec-family-religious-studies-o-level");
    expect(resolveSubjectCatalogEntry("Family & Religious Studies")?.id).toBe("zimsec-family-religious-studies-o-level");
    expect(resolveSubjectCatalogEntry("Business 9609")?.id).toBe("cambridge-business-9609");
    expect(resolveSubjectCatalogEntry("Economics 9708")?.id).toBe("cambridge-economics-9708");
    expect(resolveSubjectCatalogEntry("Geography 9696")?.id).toBe("cambridge-geography-9696");
    expect(resolveSubjectCatalogEntry("Business Studies")?.id).toBe("business-studies");
    expect(resolveSubjectCatalogEntry("Business")?.id).toBe("business-studies");
  });

  it("carries explicit board, qualification and syllabus identities for reported subjects", () => {
    expect(SUBJECT_CATALOG.find(subject => subject.id === "zimsec-family-religious-studies-o-level")?.offerings).toEqual([
      { boardId: "zimsec", qualificationId: "o_level", syllabusCode: "4047" },
    ]);
    expect(SUBJECT_CATALOG.find(subject => subject.id === "cambridge-business-9609")?.offerings?.[0]).toEqual({
      boardId: "cambridge", qualificationId: "a_level", syllabusCode: "9609", syllabusVersion: "2026-2028",
    });
    expect(SUBJECT_CATALOG.find(subject => subject.id === "cambridge-economics-9708")?.offerings?.[0]).toMatchObject({ syllabusCode: "9708", syllabusVersion: "2026-2028" });
    expect(SUBJECT_CATALOG.find(subject => subject.id === "cambridge-geography-9696")?.offerings?.[0]).toMatchObject({ syllabusCode: "9696", syllabusVersion: "2027-2029" });
  });

  it("preserves custom subject identities without treating them as catalogue entries", () => {
    expect(canonicalSubjectId("Marine Engineering")).toBe("marine-engineering");
    expect(resolveSubjectCatalogEntry("Marine Engineering")).toBeNull();
    expect(canonicalSubjectName("Marine Engineering")).toBe("Marine Engineering");
  });

  it("keeps the native Android catalogue in exact parity with web metadata", () => {
    const kotlin = readFileSync(
      join(process.cwd(), "android/app/src/main/java/com/shadecode/student/NativeSubjectCatalog.kt"),
      "utf8",
    );
    const parseList = (value: string | undefined) => [...(value ?? "").matchAll(/"([^"]*)"/g)].map((match) => match[1]);
    const nativeEntries = new Map<string, { name: string; category: string; pathways: string[]; aliases: string[] }>();
    const entryPattern = /NativeSubjectOption\("([^"]*)", "([^"]*)", "([^"]*)", listOf\(([^)]*)\)(?:, listOf\(([^)]*)\))?\)/g;
    for (const match of kotlin.matchAll(entryPattern)) {
      nativeEntries.set(JSON.parse(`"${match[1]}"`), {
        name: JSON.parse(`"${match[2]}"`),
        category: JSON.parse(`"${match[3]}"`),
        pathways: parseList(match[4]),
        aliases: parseList(match[5]),
      });
    }

    const offeringLines = [...kotlin.matchAll(/"([^"]+)" to listOf\(NativeCurriculumOffering\("([^"]+)", "([^"]+)", "([^"]+)"(?:, "([^"]+)")?\)\)/g)];
    const nativeOfferings = new Map(offeringLines.map(match => [match[1], [{ boardId: match[2], qualificationId: match[3], syllabusCode: match[4], ...(match[5] ? { syllabusVersion: match[5] } : {}) }]]));
    expect(nativeOfferings.size).toBe(SUBJECT_CATALOG.filter(subject => subject.offerings?.length).length);
    expect(nativeEntries.size).toBe(SUBJECT_CATALOG.length);
    for (const subject of SUBJECT_CATALOG) {
      expect(nativeEntries.get(subject.id)).toEqual({
        name: subject.name,
        category: subject.category,
        pathways: [...subject.pathways],
        aliases: [...(subject.aliases ?? [])],
      });
      expect(nativeOfferings.get(subject.id) ?? []).toEqual(subject.offerings ?? []);
    }
  });

});
