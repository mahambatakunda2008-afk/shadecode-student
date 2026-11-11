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

  it("registers the four reported qualifications against exact official-source intake records", () => {
    const queue = JSON.parse(readFileSync(join(process.cwd(), "docs/curriculum/official-source-intake-queue.json"), "utf8"));
    const expected = [
      ["cambridge-9609-2026-2028", "9609", "2026-2028", "source_confirmed_content_not_ingested"],
      ["cambridge-9708-2026-2028", "9708", "2026-2028", "source_confirmed_content_not_ingested"],
      ["cambridge-9696-2027-2029", "9696", "2027-2029", "source_confirmed_content_not_ingested"],
      ["zimsec-4047-frs-o-level", "4047", "current-edition-to-be-confirmed", "source_discovery_required"],
    ] as const;
    for (const [id, code, version, status] of expected) {
      const item = queue.items.find((entry: { id: string }) => entry.id === id);
      expect(item).toBeDefined();
      expect(item.syllabusId).toBe(code);
      expect(item.syllabusVersion).toBe(version);
      expect(item.status).toBe(status);
      expect(item.requiredChecks.length).toBeGreaterThan(0);
    }
    expect(queue.items.find((entry: { id: string }) => entry.id === "zimsec-4047-frs-o-level")?.sourceDocumentUrl).toBeNull();
  });

  it("keeps the first official scope map explicit about version and FRS evidence limits", () => {
    const scopeMap = readFileSync(join(process.cwd(), "docs/curriculum/REPORTED_SUBJECTS_SCOPE_MAP_2026-11-11.md"), "utf8");
    expect(scopeMap).toContain("AS scope: topics 1.1–5.5");
    expect(scopeMap).toContain("AS scope: topics 1.1–6.5");
    expect(scopeMap).toContain("2027, 2028 and 2029");
    expect(scopeMap).toContain("exact official syllabus PDF not yet discovered");
    expect(scopeMap).toContain("complete normalized syllabus pack");
  });

  it("pins the current official Cambridge syllabus structure and assessment boundaries", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "docs/curriculum/manifests/cambridge-2026-2028-and-2027-2029-structure.json"), "utf8"));
    expect(manifest.status).toBe("structure_extracted_not_independently_reviewed");
    const economicsAs = manifest.qualifications.find((item: { code: string; level: string }) => item.code === "9708" && item.level === "AS");
    const economicsA = manifest.qualifications.find((item: { code: string; level: string }) => item.code === "9708" && item.level === "A");
    expect(economicsAs.topicRange).toBe("1.1-6.5");
    expect(economicsAs.topics).toHaveLength(6);
    expect(economicsA.topicRange).toBe("1.1-11.6");
    expect(economicsA.topics.map((topic: { id: string }) => topic.id)).toEqual(["7", "8", "9", "10", "11"]);
    expect(economicsAs.assessment.find((paper: { paper: number }) => paper.paper === 2)?.durationMinutes).toBe(120);
    const businessA = manifest.qualifications.find((item: { code: string; level: string }) => item.code === "9609" && item.level === "A");
    expect(businessA.topics).toHaveLength(5);
    expect(businessA.assessment.map((paper: { paper: number }) => paper.paper)).toEqual([3, 4]);
    const geographyA = manifest.qualifications.find((item: { code: string; level: string }) => item.code === "9696" && item.level === "A");
    expect(geographyA.optionalGroups.every((group: { choose: number; from: string[] }) => group.choose === 2 && group.from.length === 4)).toBe(true);
    expect(manifest.sources.every((source: { pageCount: number; pdf: string }) => source.pageCount > 0 && source.pdf.startsWith("https://"))).toBe(true);
  });

  it("validates the Economics 9708 AS numbered outcome registry and explicit exclusions", () => {
    const manifest = JSON.parse(readFileSync(join(process.cwd(), "docs/curriculum/manifests/economics-9708-2026-2028-as-outcomes.json"), "utf8"));
    expect(manifest.source.documentVersion).toBe(1);
    expect(manifest.qualificationBoundary.asLevel).toBe("1.1-6.5");
    expect(manifest.topics.map((topic: { id: string }) => topic.id)).toEqual(["1", "2", "3", "4", "5", "6"]);
    const subtopics = manifest.topics.flatMap((topic: { subtopics: { 0: string; 2: string[] }[] }) => topic.subtopics);
    expect(subtopics).toHaveLength(29);
    expect(new Set(subtopics.map((item: { 0: string }) => item[0])).size).toBe(29);
    expect(subtopics.every((item: { 2: string[] }) => item[2].length > 0)).toBe(true);
    expect(manifest.crossCuttingRequirements.exclusionsAndCautions).toContain("Gini coefficient calculation is not required.");
    expect(manifest.crossCuttingRequirements.representations).toContain("labelled economic diagrams");
    expect(manifest.status).toBe("source_extracted_not_independently_reviewed");
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
