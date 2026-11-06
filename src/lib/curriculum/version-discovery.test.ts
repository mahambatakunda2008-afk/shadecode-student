import { describe, expect, it } from "vitest";
import { discoverSyllabusVersion } from "./version-discovery";

describe("syllabus version discovery", () => {
  it("recognises Cambridge three-year exam series wording", () => {
    const result = discoverSyllabusVersion("Use this syllabus for exams in 2028, 2029 and 2030.");
    expect(result.version).toBe("2028-2030");
    expect(result.confidence).toBe("high");
    expect(result.evidence[0]).toContain("2028, 2029 and 2030");
  });

  it("does not infer a three-year range from non-consecutive years", () => {
    const result = discoverSyllabusVersion("Use this syllabus for exams in 2028, 2030 and 2031.");
    expect(result.version).toBeNull();
  });

  it("continues to recognise explicit hyphenated syllabus cycles", () => {
    const result = discoverSyllabusVersion("Cambridge syllabus 2028-2030");
    expect(result.version).toBe("2028-2030");
  });
});
