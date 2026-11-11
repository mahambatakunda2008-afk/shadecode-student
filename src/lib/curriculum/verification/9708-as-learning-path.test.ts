import { describe, expect, it } from "vitest";
import blueprint from "../../../../docs/curriculum/learning-paths/economics-9708-2026-2028-as-blueprint.json";

describe("Cambridge 9708 AS learning-path blueprint", () => {
  it("maps every extracted AS subtopic without crossing into A Level", () => {
    expect(blueprint.qualificationBoundary).toEqual({
      asOnly: true,
      subtopics: "1.1-6.5",
      aLevelExcluded: true,
    });
    expect(blueprint.subtopics).toHaveLength(29);
    expect(blueprint.subtopics.map((item) => item.id)).toEqual(
      expect.arrayContaining(["1.1", "2.2", "4.3", "5.2", "6.5"]),
    );
    expect(blueprint.subtopics.reduce((count, item) => count + item.outcomeCount, 0)).toBe(130);
  });

  it("requires active practice and evidence, not passive lesson completion", () => {
    expect(blueprint.lessonSequence).toEqual([
      "diagnostic_retrieval",
      "conceptual_model",
      "worked_reasoning",
      "guided_application",
      "independent_practice",
      "misconception_check",
      "transfer_and_synthesis",
    ]);
    expect(blueprint.masteryRule).toContain("independent application");
    expect(blueprint.masteryRule).toContain("exam-style transfer");
  });

  it("preserves subject-specific modalities and offline requirements", () => {
    const allPractice = new Set(blueprint.subtopics.flatMap((item) => item.requiredPractice));
    expect(allPractice).toContain("diagram_construction");
    expect(allPractice).toContain("worked_calculation");
    expect(allPractice).toContain("data_interpretation");
    expect(blueprint.offlineRule).toContain("No runtime AI or network dependency");
    for (const item of blueprint.subtopics) {
      expect(item.masteryEvidence).toContain("independent_application");
      expect(item.offlineAssets).toContain("answer_rationales");
    }
  });

  it("does not misrepresent a pathway blueprint as completed teaching content", () => {
    expect(blueprint.status).toBe("blueprint_not_lesson_content");
    expect(blueprint.trustBoundary).toContain("Not lesson content");
    expect(blueprint.trustBoundary).toContain("Independent source review");
  });
});
