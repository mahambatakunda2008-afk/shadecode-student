import { describe, expect, it } from "vitest";
import practiceSet from "./biology-9700-practical-practice-2028-2030.json";

describe("Cambridge Biology 9700 practical practice set 1", () => {
  const findQuestion = (taskId: string, questionId: string) =>
    practiceSet.tasks.find((task) => task.id === taskId)?.questions
      .find((question) => question.id === questionId);

  it("keeps original practice material unpublished and clearly sourced", () => {
    expect(practiceSet.status).toBe("draft");
    expect(practiceSet.publicationStatus).toBe("unpublished");
    expect(practiceSet.provenance.sourceUrl).toContain("cambridgeinternational.org");
    expect(practiceSet.assessmentNotice).toContain("not official Cambridge mark schemes");
    expect(findQuestion("P3-02", "a")?.prompt).toContain("36 mm");
    expect(findQuestion("P3-02", "a")?.prompt).toContain("120 µm");
    expect(practiceSet.tasks).toHaveLength(8);
    expect(practiceSet.tasks.reduce((sum, task) => sum + task.questions.length, 0)).toBe(60);
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
    let totalPracticeMarks = 0;
    for (const task of practiceSet.tasks) {
      expect(task.questions.length).toBeGreaterThan(0);
      expect(task.questions.every((question) => question.prompt.length > 20)).toBe(true);
      expect(task.questions.every((question) => question.answer.length > 0)).toBe(true);
      expect(task.questions.every((question) => question.marks > 0)).toBe(true);
      const taskMarks = task.questions.reduce((sum, question) => sum + question.marks, 0);
      expect(taskMarks).toBe(task.markingGuide.totalPracticeMarks);
      totalPracticeMarks += taskMarks;
    }
    expect(totalPracticeMarks).toBe(209);
  });

  it("covers A Level statistical analysis and appropriate test selection", () => {
    const statistics = practiceSet.tasks.find((task) => task.id === "P5-02");
    const testSelection = practiceSet.tasks.find((task) => task.id === "P5-03");
    expect(statistics?.syllabusStage).toBe("a_level_extension");
    expect(statistics?.questions.find((question) => question.id === "f")?.answer.join(" "))
      .toContain("2.101");
    const confidenceInterval = statistics?.questions.find((question) => question.id === "c");
    expect(confidenceInterval?.prompt).toContain("2.262");
    expect(confidenceInterval?.answer.join(" ")).toContain("4.37 to 5.23 mg");
    expect(confidenceInterval?.answer.join(" ")).toContain("5.53 to 6.67 mg");
    expect(confidenceInterval?.answer.join(" ")).toContain("not the large-sample normal value 1.96");
    expect(testSelection?.skills).toContain("choose statistical test");
    expect(testSelection?.questions.find((question) => question.id === "a")?.answer.join(" "))
      .toContain("Spearman's rank correlation");
  });

  it("includes the five-value investigation expectation and repeat measurements", () => {
    const investigation = practiceSet.tasks.find((task) => task.id === "P3-01");
    expect(investigation?.questions.find((question) => question.id === "b")?.answer.join(" "))
      .toContain("five");
    expect(investigation?.questions.find((question) => question.id === "d")?.answer.join(" "))
      .toContain("three");
    const catalaseGraph = investigation?.questions.find((question) => question.id === "f");
    expect(catalaseGraph?.data?.rows).toHaveLength(6);
    expect(catalaseGraph?.data?.columns).toContain("Mean oxygen volume / cm³");
    expect(catalaseGraph?.prompt).toContain("results are shown below");
    expect(catalaseGraph?.data?.rows.every((row) => row.length === catalaseGraph.data?.columns.length)).toBe(true);
    const potometerGraph = findQuestion("P3-05", "g");
    expect(potometerGraph?.data?.rows).toHaveLength(5);
    expect(potometerGraph?.data?.columns).toContain("Mean water uptake / mm³ min⁻¹");
    expect(potometerGraph?.answer.join(" ")).toContain("potometer measures water uptake");
    expect(potometerGraph?.data?.rows.every((row) => row.length === potometerGraph.data?.columns.length)).toBe(true);
  });

  it("supplies original numerical datasets for graphing and statistical analysis", () => {
    const osmosis = findQuestion("P3-03", "g");
    const amylase = findQuestion("P3-04", "g");
    const statistics = findQuestion("P5-02", "b");
    for (const question of [osmosis, amylase, statistics]) {
      expect(question?.data).toBeDefined();
      expect(question?.data?.columns.length).toBeGreaterThan(1);
      expect(question?.data?.rows.length).toBeGreaterThanOrEqual(2);
      expect(question?.data?.rows.every((row) => row.length === question.data?.columns.length)).toBe(true);
    }
    expect(osmosis?.data?.rows).toHaveLength(6);
    expect(amylase?.data?.rows).toHaveLength(7);
    expect(statistics?.data?.rows).toHaveLength(2);
    const photosynthesisRates = findQuestion("P5-01", "f");
    expect(photosynthesisRates?.data?.columns).toContain("Mean oxygen production / cm³ min⁻¹");
    expect(photosynthesisRates?.data?.rows).toHaveLength(5);
    expect(photosynthesisRates?.prompt).toContain("shown below");
    const photosynthesisVariation = findQuestion("P5-01", "g");
    expect(photosynthesisVariation?.data?.columns).toContain("Repeat 1 oxygen production / cm³ min⁻¹");
    expect(photosynthesisVariation?.data?.rows).toHaveLength(5);
    expect(photosynthesisVariation?.data?.rows.every((row) => {
      const repeats = row.slice(1, 4).map(Number);
      const mean = Number(row[4]);
      return repeats.length === 3 && Math.abs(repeats.reduce((sum, value) => sum + value, 0) / 3 - mean) < 0.001;
    })).toBe(true);
    const spearman = findQuestion("P5-03", "h");
    expect(spearman?.data?.rows).toHaveLength(8);
    expect(spearman?.data?.columns).toContain("Species abundance rank");
    expect(spearman?.answer.join(" ")).toContain("0.857");
    expect(spearman?.data?.rows.every((row) => row.length === spearman.data?.columns.length)).toBe(true);
  });
});
