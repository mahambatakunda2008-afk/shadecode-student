import { describe, expect, it } from "vitest";
import { CURRICULUM_SOURCE_WATCHES, getCurriculumSourceWatch } from "./source-watch";

describe("Cambridge Biology 9700 2028–2030 source registration", () => {
  const source = getCurriculumSourceWatch("cambridge-as-a-level-biology-9700-2028-2030");

  it("registers the official 2028–2030 syllabus as a version-pinned source", () => {
    expect(source).toBeDefined();
    expect(source).toMatchObject({
      id: "cambridge-as-a-level-biology-9700-2028-2030",
      boardId: "cambridge",
      qualificationId: "cambridge-as-a-level",
      subjectId: "biology",
      level: "as_a_level",
      syllabusId: "cambridge-9700",
      syllabusVersion: "2028-2030",
      authority: "Cambridge International Education",
      kind: "pdf",
      url: "https://www.cambridgeinternational.org/Images/744622-2028-2030-syllabus.pdf",
      frequency: "weekly",
      discoverLinkedDocuments: false,
      extractText: true,
      autoPromote: false,
    });
  });

  it("restricts retrieval to Cambridge's official syllabus domain", () => {
    expect(source?.allowedDomains).toEqual([
      "www.cambridgeinternational.org",
      "cambridgeinternational.org",
    ]);
    expect(new URL(source!.url).hostname).toBe("www.cambridgeinternational.org");
  });

  it("keeps every watched source non-promoting by default", () => {
    expect(CURRICULUM_SOURCE_WATCHES.length).toBeGreaterThan(0);
    expect(CURRICULUM_SOURCE_WATCHES.every((item) => item.autoPromote === false)).toBe(true);
  });
});
