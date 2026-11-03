import { describe, expect, it } from "vitest";
import {
  canAttemptPracticalSet,
  getPracticalQuestionFeedback,
  getPracticalQuestionSkills,
  ratePracticalSkill,
  retryPracticalQuestion,
  recommendPracticalPractice,
  revealPracticalGuidance,
  savePracticalAnswer,
  selfAwardPracticalMarks,
  startPracticalAttempt,
  summarizePracticalAttempt,
  togglePracticalAnswerPoint,
  type PracticalPracticeSet,
} from "./biology-practical-attempt";

const set: PracticalPracticeSet = {
  id: "biology-practical-preview",
  status: "draft",
  publicationStatus: "unpublished",
  tasks: [
    {
      id: "P3-01",
      title: "Catalase",
      paper: "Paper 3",
      skills: ["variables", "repeats", "graph"],
      questions: [
        { id: "a", marks: 3, prompt: "Identify variables.", answer: ["Independent variable", "Dependent variable"] },
        { id: "b", marks: 2, prompt: "Explain repeats.", answer: ["Repeat at least three times"] },
      ],
    },
    {
      id: "P5-01",
      title: "Planning",
      paper: "Paper 5",
      skills: ["variables", "planning"],
      questions: [
        { id: "a", marks: 2, prompt: "Plan an investigation.", answer: ["Define variables"] },
      ],
    },
  ],
};

describe("Biology practical attempt preview", () => {
  it("only allows explicitly draft and unpublished sets", () => {
    expect(canAttemptPracticalSet(set)).toBe(true);
    expect(canAttemptPracticalSet({ ...set, status: "published" })).toBe(false);
    expect(canAttemptPracticalSet({ ...set, publicationStatus: "published" })).toBe(false);
  });

  it("records answers and reveals guidance only when requested", () => {
    const initial = startPracticalAttempt(set, "2026-11-03T00:00:00.000Z");
    const answered = savePracticalAnswer(set, initial, "P3-01", "a", "Temperature; oxygen volume.");
    expect(answered.revealedAnswers).toEqual([]);
    const revealed = revealPracticalGuidance(set, answered, "P3-01", "a");
    expect(revealed.revealedAnswers).toEqual(["P3-01::a"]);
    expect(revealed.answers["P3-01::a"]).toBe("Temperature; oxygen volume.");
  });

  it("tracks self-assessment by task skill and highlights gaps", () => {
    let attempt = startPracticalAttempt(set);
    attempt = ratePracticalSkill(set, attempt, "P3-01", "variables", "secure");
    attempt = ratePracticalSkill(set, attempt, "P3-01", "repeats", "revisit");
    const summary = summarizePracticalAttempt(set, attempt);
    expect(summary.skillsToRevisit).toContain("repeats");
    expect(summary.skillsToRevisit).toContain("graph");
    expect(summary.skillsToRevisit).toContain("planning");
    expect(summary.skills.find((skill) => skill.skill === "variables")?.rating).toBe("developing");
    expect(summary.skills.find((skill) => skill.skill === "variables")?.reviewedTaskCount).toBe(1);
    expect(summary.skills.find((skill) => skill.skill === "variables")?.totalTaskCount).toBe(2);
  });


  it("aggregates the same skill across tasks and preserves task-level ratings", () => {
    let attempt = startPracticalAttempt(set);
    attempt = ratePracticalSkill(set, attempt, "P3-01", "variables", "secure");
    attempt = ratePracticalSkill(set, attempt, "P5-01", "variables", "revisit");
    const review = summarizePracticalAttempt(set, attempt).skills.find((skill) => skill.skill === "variables");
    expect(review?.rating).toBe("revisit");
    expect(review?.taskIds).toEqual(["P3-01", "P5-01"]);
    expect(review?.taskRatings).toEqual({ "P3-01": "secure", "P5-01": "revisit" });
    expect(review?.reviewedTaskCount).toBe(2);
    expect(review?.totalTaskCount).toBe(2);
  });

  it("tracks self-check points independently and rejects invalid points", () => {
    const initial = startPracticalAttempt(set);
    const checked = togglePracticalAnswerPoint(set, initial, "P3-01", "a", 0);
    expect(checked.checkedAnswerPoints["P3-01::a"]).toEqual([0]);
    const unchecked = togglePracticalAnswerPoint(set, checked, "P3-01", "a", 0);
    expect(unchecked.checkedAnswerPoints["P3-01::a"]).toEqual([]);
    expect(() => togglePracticalAnswerPoint(set, initial, "P3-01", "a", 9)).toThrow();
  });

  it("reports Paper 3 and Paper 5 coverage separately", () => {
    let attempt = startPracticalAttempt(set);
    attempt = savePracticalAnswer(set, attempt, "P3-01", "a", "A response");
    attempt = selfAwardPracticalMarks(set, attempt, "P3-01", "a", 2);
    const coverage = summarizePracticalAttempt(set, attempt).paperCoverage;
    expect(coverage["Paper 3"]).toEqual({ taskCount: 1, questionCount: 2, answeredQuestions: 1, availableMarks: 5, selfAwardedMarks: 2 });
    expect(coverage["Paper 5"]).toEqual({ taskCount: 1, questionCount: 1, answeredQuestions: 0, availableMarks: 2, selfAwardedMarks: 0 });
  });

  it("recommends another task for a skill rated revisit", () => {
    let attempt = startPracticalAttempt(set);
    attempt = ratePracticalSkill(set, attempt, "P3-01", "variables", "revisit");
    const recommendation = summarizePracticalAttempt(set, attempt).recommendedPractice.find((item) => item.skill === "variables");
    expect(recommendation).toMatchObject({ taskId: "P5-01", taskTitle: "Planning", questionId: "a", rating: "revisit" });
  });

  it("does not recommend skills rated secure across every relevant task", () => {
    let attempt = startPracticalAttempt(set);
    for (const task of set.tasks) {
      for (const skill of task.skills) attempt = ratePracticalSkill(set, attempt, task.id, skill, "secure");
    }
    const summary = summarizePracticalAttempt(set, attempt);
    expect(summary.recommendedPractice).toEqual([]);
    expect(summary.skillsToRevisit).toEqual([]);
  });

  it("prefers an unanswered task for a developing skill", () => {
    let attempt = startPracticalAttempt(set);
    attempt = ratePracticalSkill(set, attempt, "P3-01", "variables", "developing");
    attempt = savePracticalAnswer(set, attempt, "P5-01", "a", "Already attempted");
    const recommendation = summarizePracticalAttempt(set, attempt).recommendedPractice.find((item) => item.skill === "variables");
    expect(recommendation?.taskId).toBe("P3-01");
    expect(recommendation?.questionId).toBe("a");
  });

  it("separates biological understanding, practical technique, data handling and evaluation", () => {
    const extendedSet: PracticalPracticeSet = {
      ...set,
      tasks: [{ ...set.tasks[0], skills: ["osmosis", "control of variables", "graph", "limitations and improvements"] }],
    };
    const summary = summarizePracticalAttempt(extendedSet, startPracticalAttempt(extendedSet));
    expect(summary.skills.map(({ skill, domain }) => [skill, domain])).toEqual([
      ["osmosis", "biological-understanding"],
      ["control of variables", "experimental-technique"],
      ["graph", "data-handling"],
      ["limitations and improvements", "evaluation"],
    ]);
    expect(summary.skills[0].improvementFocus).toContain("biological principle");
    expect(summary.skills[1].improvementFocus).toContain("equipment");
    expect(summary.skills[2].improvementFocus).toContain("units and precision");
    expect(summary.skills[3].improvementFocus).toContain("limitation");
  });
  it("builds a transparent practice-review summary without predicting exam readiness", () => {
    let attempt = startPracticalAttempt(set);
    let summary = summarizePracticalAttempt(set, attempt);
    expect(summary.practiceReview).toMatchObject({
      answeredPercent: 0, skillsReviewed: 0, totalSkills: 4, skillReviewPercent: 0,
      checkedGuidancePoints: 0, availableGuidancePoints: 0, status: "not-started",
    });
    attempt = savePracticalAnswer(set, attempt, "P3-01", "a", "My answer");
    attempt = revealPracticalGuidance(set, attempt, "P3-01", "a");
    attempt = togglePracticalAnswerPoint(set, attempt, "P3-01", "a", 0);
    summary = summarizePracticalAttempt(set, attempt);
    expect(summary.practiceReview.answeredPercent).toBe(33);
    expect(summary.practiceReview.checkedGuidancePoints).toBe(1);
    expect(summary.practiceReview.availableGuidancePoints).toBe(2);
    expect(summary.practiceReview.guidanceReviewPercent).toBe(50);
    expect(summary.practiceReview.status).toBe("in-progress");
  });

  it("clears only the selected question's answer and feedback state for a fresh retry", () => {
    let attempt = startPracticalAttempt(set);
    attempt = savePracticalAnswer(set, attempt, "P3-01", "a", "Initial response");
    attempt = savePracticalAnswer(set, attempt, "P3-01", "b", "Keep this response");
    attempt = revealPracticalGuidance(set, attempt, "P3-01", "a");
    attempt = togglePracticalAnswerPoint(set, attempt, "P3-01", "a", 0);
    attempt = selfAwardPracticalMarks(set, attempt, "P3-01", "a", 2);

    const retried = retryPracticalQuestion(set, attempt, "P3-01", "a");
    expect(retried.answers).toEqual({ "P3-01::b": "Keep this response" });
    expect(retried.revealedAnswers).toEqual([]);
    expect(retried.checkedAnswerPoints).toEqual({});
    expect(retried.selfAwardedMarks).toEqual({});
    expect(retried.startedAt).toBe(attempt.startedAt);
    expect(() => retryPracticalQuestion(set, attempt, "P3-01", "missing")).toThrow();
  });

  it("bounds self-awarded marks and calculates transparent totals", () => {
    let attempt = startPracticalAttempt(set);
    attempt = selfAwardPracticalMarks(set, attempt, "P3-01", "a", 2);
    attempt = selfAwardPracticalMarks(set, attempt, "P3-01", "b", 1);
    const summary = summarizePracticalAttempt(set, attempt);
    expect(summary.selfAwardedMarks).toBe(3);
    expect(summary.availableMarks).toBe(7);
    expect(() => selfAwardPracticalMarks(set, attempt, "P3-01", "a", 4)).toThrow();
  });


  it("gives targeted question-level coaching across practical skill categories", () => {
    expect(getPracticalQuestionFeedback({ prompt: "Calculate the percentage change in mass.", answer: [] }).category).toBe("calculations");
    expect(getPracticalQuestionFeedback({ prompt: "Describe a method to control variables and repeat the experiment.", answer: [] }).category).toBe("method-design");
    expect(getPracticalQuestionFeedback({ prompt: "Explain how to measure the length using a calibrated microscope.", answer: [] }).category).toBe("measurement");
    expect(getPracticalQuestionFeedback({ prompt: "Describe the trend shown by the graph.", answer: [] }).category).toBe("interpretation");
    expect(getPracticalQuestionFeedback({ prompt: "Evaluate two limitations and suggest improvements.", answer: [] }).category).toBe("evaluation");
    expect(getPracticalQuestionFeedback({ prompt: "Explain why osmosis causes the observed change.", answer: [] }).category).toBe("biological-knowledge");
  });

  it("maps practical questions to relevant task skills", () => {
    const task = { skills: ["independent and dependent variables", "repeats", "control of variables", "graph", "conclusion"] };
    expect(getPracticalQuestionSkills(task, { prompt: "State the independent variable and dependent variable.", answer: ["Independent variable: temperature.", "Dependent variable: oxygen volume."] })).toContain("independent and dependent variables");
    expect(getPracticalQuestionSkills(task, { prompt: "Describe the graph and explain the conclusion.", answer: ["Plot the mean values and describe the trend."] })).toEqual(expect.arrayContaining(["graph", "conclusion"]));
    expect(getPracticalQuestionSkills(task, { prompt: "Explain why repeats are needed.", answer: ["Repeat each condition at least three times."] })).toContain("repeats");
  });
  it("recognises syllabus skill synonyms that differ from the skill label", () => {
    expect(getPracticalQuestionSkills(
      { skills: ["anomalies", "repeats", "evaluation"] },
      { prompt: "Investigate an anomalous endpoint time and explain how to improve reliability.", answer: ["Repeat the measurement and investigate the outlier."] },
    )).toEqual(expect.arrayContaining(["anomalies", "repeats", "evaluation"]));

    expect(getPracticalQuestionSkills(
      { skills: ["graphing", "interpretation", "conclusion"] },
      { prompt: "Describe the pattern and relationship shown by the plotted results.", answer: ["The trend suggests the response approaches a plateau."] },
    )).toEqual(expect.arrayContaining(["graphing", "interpretation", "conclusion"]));

    expect(getPracticalQuestionSkills(
      { skills: ["rate calculation", "timing", "measurement"] },
      { prompt: "Calculate the mean rate from the time taken for the endpoint.", answer: ["Rate = 1 divided by mean time, in s⁻¹."] },
    )).toEqual(expect.arrayContaining(["rate calculation", "timing"]));
  });

  it("returns only skills declared by the current task", () => {
    const declared = ["variables", "repeats", "graph"];
    const mapped = getPracticalQuestionSkills(
      { skills: declared },
      { prompt: "Identify variables, repeat the test and plot a graph.", answer: ["Use at least three repeats."] },
    );
    expect(mapped.every((skill) => declared.includes(skill))).toBe(true);
  });

  it("rejects unknown questions and skills", () => {
    const attempt = startPracticalAttempt(set);
    expect(() => savePracticalAnswer(set, attempt, "P3-01", "missing", "x")).toThrow();
    expect(() => ratePracticalSkill(set, attempt, "P3-01", "microscopy", "secure")).toThrow();
  });
});
