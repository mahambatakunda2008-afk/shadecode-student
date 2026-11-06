import { describe, expect, it } from "vitest";
import practiceSet from "./biology-9700-practical-practice-2028-2030.json";

describe("Cambridge Biology 9700 practical practice set 1", () => {
  it("keeps original practice material unpublished and clearly sourced", () => {
    expect(practiceSet.status).toBe("draft");
    expect(practiceSet.publicationStatus).toBe("unpublished");
    expect(practiceSet.provenance.sourceUrl).toContain("cambridgeinternational.org");
    expect(practiceSet.assessmentNotice).toContain("not official Cambridge mark schemes");
    expect(practiceSet.tasks).toHaveLength(8);
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
    const rangeQuestion = investigation?.questions.find((question) => question.id === "b");
    expect(rangeQuestion?.prompt.toLowerCase()).toContain("at least five");
    expect(rangeQuestion?.answer.join(" ")).toContain("10, 20, 30, 40, 50 and 60");
    expect(investigation?.questions.find((question) => question.id === "d")?.answer.join(" "))
      .toContain("three");
  });
  it("contains the complete eight-task, sixty-question practice bank with consistent marks", () => {
    expect(practiceSet.tasks.reduce((sum, task) => sum + task.questions.length, 0)).toBe(60);
    expect(practiceSet.tasks.reduce((sum, task) => sum + task.markingGuide.totalPracticeMarks, 0)).toBe(209);
    expect(practiceSet.tasks.every((task) => task.questions.length >= 4)).toBe(true);
  });

  it("provides numeric datasets for all curated graph-practice questions", () => {
    const graphQuestions = [
      ["P3-01", "f"], ["P3-03", "g"], ["P3-04", "g"], ["P5-01", "g"],
    ] as const;
    for (const [taskId, questionId] of graphQuestions) {
      const question = practiceSet.tasks.find((task) => task.id === taskId)?.questions.find((item) => item.id === questionId);
      expect(question?.data?.rows.length, taskId + " question " + questionId).toBeGreaterThan(1);
      expect(question?.data?.columns.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("includes a worked Spearman rank calculation with paired observations", () => {
    const task = practiceSet.tasks.find((item) => item.id === "P5-03");
    const question = task?.questions.find((item) => item.id === "h");
    expect(question?.data?.rows).toHaveLength(6);
    expect(question?.answer.join(" ")).toContain("Σd² = 6");
    expect(question?.answer.join(" ")).toContain("0.829");
  });

});
