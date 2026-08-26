import { describe, expect, it } from "vitest";
import { buildExamBlueprint } from "./examBlueprint";

describe("buildExamBlueprint", () => {
  it("creates diagram-aware physics exams", () => {
    const blueprint = buildExamBlueprint({ subject: "Physics", topic: "Forces", difficulty: "Hard", questionCount: 10 });
    expect(blueprint.includeDiagrams).toBe(true);
    expect(blueprint.questionTypes).toContain("calculation");
    expect(blueprint.diagramTypes).toContain("force_diagram");
  });

  it("bounds question count", () => {
    expect(buildExamBlueprint({ subject: "Biology", difficulty: "Easy", questionCount: 100 }).questionCount).toBe(40);
    expect(buildExamBlueprint({ subject: "Biology", difficulty: "Easy", questionCount: 0 }).questionCount).toBe(1);
  });
});
