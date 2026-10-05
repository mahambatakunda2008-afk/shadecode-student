import { describe, expect, it } from "vitest";
import { rollUpSyllabusCoverage } from "./coverage";
import type { CurriculumTopicUnit } from "./resolver";

const u = (syllabusId: string, subjectId: string, topicKey: string, title: string): CurriculumTopicUnit => ({ syllabusId, subjectId, topicKey, title });
const UNITS = [
  u("cambridge-9702", "physics", "1.1", "Physical quantities"),
  u("cambridge-9702", "physics", "1.2", "SI units"),
  u("cambridge-9702", "physics", "5.1", "Energy conservation"),
  u("cambridge-9701", "chemistry", "1.2", "Isotopes"),
];

describe("rollUpSyllabusCoverage", () => {
  it("counts practised subsections against the verified total and names the weakest by title", () => {
    const result = rollUpSyllabusCoverage(
      [
        { syllabus_id: "cambridge-9702", curriculum_topic_key: "1.1", mastery_score: 80 },
        { syllabus_id: "cambridge-9702", curriculum_topic_key: "5.1", mastery_score: 40, last_attempted: "2026-10-01T10:00:00Z" },
      ],
      UNITS,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ syllabusId: "cambridge-9702", subjectId: "physics", totalSubsections: 3, practisedSubsections: 2, averageMastery: 60 });
    expect(result[0].weakest[0]).toMatchObject({ topicKey: "5.1", title: "Energy conservation", mastery: 40, lastAttempted: "2026-10-01T10:00:00Z" });
  });

  it("merges several free-text topics that resolved to the same subsection", () => {
    const result = rollUpSyllabusCoverage(
      [
        { syllabus_id: "cambridge-9701", curriculum_topic_key: "1.2", mastery_score: 50, last_attempted: "2026-09-01T00:00:00Z" },
        { syllabus_id: "cambridge-9701", curriculum_topic_key: "1.2", mastery_score: 70, last_attempted: "2026-09-05T00:00:00Z" },
      ],
      UNITS,
    );
    expect(result[0].practisedSubsections).toBe(1);
    expect(result[0].weakest[0]).toMatchObject({ mastery: 60, lastAttempted: "2026-09-05T00:00:00Z" });
  });

  it("ignores unkeyed rows, unknown keys and non-numeric scores", () => {
    expect(
      rollUpSyllabusCoverage(
        [
          { syllabus_id: null, curriculum_topic_key: null, mastery_score: 90 },
          { syllabus_id: "cambridge-9702", curriculum_topic_key: "99.9", mastery_score: 90 },
          { syllabus_id: "cambridge-9702", curriculum_topic_key: "1.1", mastery_score: "n/a" },
        ],
        UNITS,
      ),
    ).toEqual([]);
  });

  it("orders weakest subsections numerically on ties", () => {
    const units = [u("s", "physics", "2.1", "A"), u("s", "physics", "10.1", "B")];
    const result = rollUpSyllabusCoverage(
      [
        { syllabus_id: "s", curriculum_topic_key: "10.1", mastery_score: 30 },
        { syllabus_id: "s", curriculum_topic_key: "2.1", mastery_score: 30 },
      ],
      units,
    );
    expect(result[0].weakest.map((item) => item.topicKey)).toEqual(["2.1", "10.1"]);
  });
});
