import { describe, expect, it } from "vitest";
import { getCurriculumSourceWatch } from "./source-watch";

describe("Cambridge Biology 9700 source registry", () => {
  it("tracks the official 2028–2030 syllabus without auto-promotion", () => {
    const source = getCurriculumSourceWatch("cambridge-as-a-level-biology-9700-2028-2030");
    expect(source).toMatchObject({
      boardId: "cambridge",
      qualificationId: "cambridge-as-a-level",
      subjectId: "biology",
      level: "as_a_level",
      syllabusId: "cambridge-9700",
      syllabusVersion: "2028-2030",
      kind: "pdf",
      url: "https://www.cambridgeinternational.org/Images/744622-2028-2030-syllabus.pdf",
      autoPromote: false,
    });
  });
});
