import { describe, expect, it } from "vitest";
import { rollUpSubsectionMastery } from "./subsectionMastery";

const units = [
  { syllabus_id: "cambridge-9702", subject_id: "physics", topic_key: "10.1", title: "Waves", level: "as_level" },
  { syllabus_id: "cambridge-9702", subject_id: "physics", topic_key: "2.1", title: "Kinematics", level: "as_level" },
  { syllabus_id: "cambridge-9701", subject_id: "chemistry", topic_key: "1.1", title: "Atoms" },
];

describe("rollUpSubsectionMastery", () => {
  it("sorts subsections numerically and reports unpractised ones as null", () => {
    const [chem, phys] = rollUpSubsectionMastery(units, []);
    expect(chem.syllabusId).toBe("cambridge-9701");
    expect(phys.topics.map((t) => t.topicKey)).toEqual(["2.1", "10.1"]);
    expect(phys.topics.every((t) => t.mastery === null)).toBe(true);
    expect(phys.practised).toBe(0);
  });

  it("averages keyed mastery per subsection and ignores unkeyed or invalid rows", () => {
    const [, phys] = rollUpSubsectionMastery(units, [
      { syllabus_id: "cambridge-9702", curriculum_topic_key: "2.1", mastery_score: 60 },
      { syllabus_id: "cambridge-9702", curriculum_topic_key: "2.1", mastery_score: "80" },
      { syllabus_id: null, curriculum_topic_key: null, mastery_score: 99 },
      { syllabus_id: "cambridge-9702", curriculum_topic_key: "10.1", mastery_score: "n/a" },
    ]);
    expect(phys.topics.find((t) => t.topicKey === "2.1")?.mastery).toBe(70);
    expect(phys.topics.find((t) => t.topicKey === "10.1")?.mastery).toBeNull();
    expect(phys.practised).toBe(1);
  });
});
