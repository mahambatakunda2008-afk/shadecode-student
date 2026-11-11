import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUBJECT_CATALOG, SUBJECT_CATEGORIES, canonicalSubjectId, canonicalSubjectName, resolveSubjectCatalogEntry } from "./catalog";

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
    const parseList = (value: string | undefined) =>
      [...(value ?? "").matchAll(/"((?:\\\\.|[^"])*)"/g)].map((match) => JSON.parse(`"${match[1]}"`));
    const nativeEntries = new Map<string, { name: string; category: string; pathways: string[]; aliases: string[] }>();
    const entryPattern = /NativeSubjectOption\("((?:\\\\.|[^"])*)", "((?:\\\\.|[^"])*)", "((?:\\\\.|[^"])*)", listOf\(([^)]*)\)(?:, listOf\(([^)]*)\))?\)/g;
    for (const match of kotlin.matchAll(entryPattern)) {
      nativeEntries.set(JSON.parse(`"${match[1]}"`), {
        name: JSON.parse(`"${match[2]}"`),
        category: JSON.parse(`"${match[3]}"`),
        pathways: parseList(match[4]),
        aliases: parseList(match[5]),
      });
    }

    expect(nativeEntries.size).toBe(SUBJECT_CATALOG.length);
    for (const subject of SUBJECT_CATALOG) {
      expect(nativeEntries.get(subject.id)).toEqual({
        name: subject.name,
        category: subject.category,
        pathways: [...subject.pathways],
        aliases: [...(subject.aliases ?? [])],
      });
    }
  });

});
