import { describe, expect, it } from "vitest";
import { detectPaperScope, readPaperScope } from "./paperScope";
import { buildTopicIndex, resolveTopic, type CurriculumTopicUnit } from "./resolver";

describe("detectPaperScope", () => {
  it("reads syllabus and paper number from the printed component code", () => {
    expect(detectPaperScope(["Cambridge International AS & A Level\nMATHEMATICS 9709/32\nPaper 3"])).toEqual({ syllabusId: "cambridge-9709", paper: 3 });
    expect(detectPaperScope(["PHYSICS 9702 / 22"])).toEqual({ syllabusId: "cambridge-9702", paper: 2 });
  });

  it("keeps the syllabus but drops an impossible paper number", () => {
    expect(detectPaperScope(["CHEMISTRY 9701/92"])).toEqual({ syllabusId: "cambridge-9701" });
  });

  it("ignores unsupported syllabi and plain text", () => {
    expect(detectPaperScope(["COMPUTER SCIENCE 0478/12", "no code here"])).toBeNull();
  });

  it("round-trips through stored metadata and rejects tampered values", () => {
    expect(readPaperScope({ paperScope: { syllabusId: "cambridge-9709", paper: 1 } })).toEqual({ syllabusId: "cambridge-9709", paper: 1 });
    expect(readPaperScope({ paperScope: { syllabusId: "cambridge-0478", paper: 1 } })).toBeNull();
    expect(readPaperScope(null)).toBeNull();
  });
});

const u = (syllabusId: string, subjectId: string, topicKey: string, title: string, level: string): CurriculumTopicUnit => ({ syllabusId, subjectId, topicKey, title, level });
const UNITS = [
  u("cambridge-9709", "mathematics", "1.8", "Integration", "as_level"),
  u("cambridge-9709", "mathematics", "2.5", "Integration", "as_level"),
  u("cambridge-9709", "mathematics", "3.5", "Integration", "a_level"),
  u("cambridge-9701", "chemistry", "16.1", "Alcohols", "as_level"),
  u("cambridge-9701", "chemistry", "32.1", "Alcohols", "a_level"),
];
const index = buildTopicIndex(UNITS);

describe("resolveTopic with a paper scope", () => {
  it("resolves a title repeated across 9709 papers using the paper number", () => {
    expect(resolveTopic("Integration", "Mathematics", index).status).toBe("ambiguous");
    expect(resolveTopic("Integration", "Mathematics", index, { syllabusId: "cambridge-9709", paper: 1 })).toMatchObject({ status: "resolved", unit: { topicKey: "1.8" } });
    expect(resolveTopic("Integration", "Mathematics", index, { syllabusId: "cambridge-9709", paper: 3 })).toMatchObject({ status: "resolved", unit: { topicKey: "3.5" } });
  });

  it("restricts AS papers to AS content for 9701", () => {
    expect(resolveTopic("Alcohols", "Chemistry", index, { syllabusId: "cambridge-9701", paper: 2 })).toMatchObject({ status: "resolved", unit: { topicKey: "16.1" } });
  });

  it("stays ambiguous on A Level papers that can examine AS knowledge", () => {
    expect(resolveTopic("Alcohols", "Chemistry", index, { syllabusId: "cambridge-9701", paper: 4 }).status).toBe("ambiguous");
  });

  it("trusts the printed code over a wrong AI subject label", () => {
    expect(resolveTopic("Alcohols", "Physics", index, { syllabusId: "cambridge-9701", paper: 2 })).toMatchObject({ status: "resolved", unit: { topicKey: "16.1" } });
  });
});
