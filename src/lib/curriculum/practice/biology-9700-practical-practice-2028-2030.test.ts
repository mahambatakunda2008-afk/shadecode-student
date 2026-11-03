import { describe, expect, it } from "vitest";
import practiceSet from "./biology-9700-practical-practice-2028-2030.json";

describe("Cambridge Biology 9700 practical practice set 1", () => {
  it("keeps original practice material unpublished and clearly sourced", () => {
    expect(practiceSet.status).toBe("draft");
    expect(practiceSet.publicationStatus).toBe("unpublished");
    expect(practiceSet.provenance.sourceUrl).toContain("cambridgeinternational.org");
    expect(practiceSet.assessmentNotice).toContain("not official Cambridge mark schemes");
    expect(practiceSet.tasks).toHaveLength(4);
  });

  it("covers Paper 3 practical skills and Paper 5 planning and evaluation", () => {
    const papers = new Set(practiceSet.tasks.map((task) => task.paper));
    expect(papers).toEqual(new Set(["Paper 3", "Paper 5"]));
    expect(practiceSet.tasks.some((task) => task.skills.includes("risk assessment"))).toBe(true);
    expect(practiceSet.tasks.some((task) => task.skills.includes("graph"))).toBe(true);
    expect(practiceSet.tasks.some((task) => task.skills.includes("conclusion"))).toBe(true);
    expect(practiceSet.tasks.some((task) => task.skills.includes("evaluation"))).toBe(true);
  });

  it("has complete prompts, answer guidance and internally consistent practice totals", () => {
    for (const task of practiceSet.tasks) {
      expect(task.questions.length).toBeGreaterThan(0);
      expect(task.questions.every((question) => question.prompt.length > 20)).toBe(true);
      expect(task.questions.every((question) => question.answer.length > 0)).toBe(true);
      expect(task.questions.every((question) => question.marks > 0)).toBe(true);
      expect(task.questions.reduce((sum, question) => sum + question.marks, 0))
        .toBe(task.markingGuide.totalPracticeMarks);
    }
  });

  it("includes the five-value investigation expectation and repeat measurements", () => {
    const investigation = practiceSet.tasks.find((task) => task.id === "P3-01");
    expect(investigation?.questions.find((question) => question.id === "b")?.answer.join(" "))
      .toContain("five");
    expect(investigation?.questions.find((question) => question.id === "d")?.answer.join(" "))
      .toContain("three");
  });
});
