import { describe, expect, it } from "vitest";
import { buildSelfCheckPlan, groupOutcomes, matchQuestionToTopic, selfCheckEvaluation, type OutcomeInput } from "./paperSelfCheck";

const rows: OutcomeInput[] = [
  { topic_key: "2.1", title: "Kinematics: outcome 1", content: "Define displacement, instantaneous speed, average speed, velocity and acceleration.", level: "as_level" },
  { topic_key: "2.1", title: "Kinematics: outcome 2", content: "Use equations of motion for constant acceleration in a straight line.", level: "as_level" },
  { topic_key: "2.1", title: "Kinematics: outcome 3", content: "Sketch and interpret displacement-time and velocity-time graphs.", level: "as_level" },
  { topic_key: "5.1", title: "Waves: outcome 1", content: "Describe wavelength, frequency, amplitude and speed of a progressive wave.", level: "as_level" },
  { topic_key: "5.1", title: "Waves: outcome 2", content: "Recall and use the wave speed equation v = f lambda.", level: "as_level" },
  { topic_key: "9.1", title: "Radioactivity: outcome 1", content: "Describe the nature of alpha, beta and gamma radiation and half-life.", level: "a_level" },
  { topic_key: "9.1", title: "Radioactivity: outcome 2", content: "Use the equation for radioactive decay to find the activity remaining.", level: "a_level" },
];
const topics = groupOutcomes(rows, "cambridge-9702");

describe("matchQuestionToTopic", () => {
  it("matches a clear question to its subsection", () => {
    const match = matchQuestionToTopic("A car accelerates uniformly from rest. Using the equations of motion, calculate its final velocity and the displacement after 8 s.", topics);
    expect(match?.topicKey).toBe("2.1");
  });
  it("matches a different clear topic", () => {
    expect(matchQuestionToTopic("The wave has a frequency of 50 Hz and a wavelength of 2.0 m. State the speed of the progressive wave and its amplitude.", topics)?.topicKey).toBe("5.1");
  });
  it("refuses vague, short or off-syllabus questions rather than guessing", () => {
    expect(matchQuestionToTopic("Explain your answer.", topics)).toBeNull();
    expect(matchQuestionToTopic("Discuss the economic impact of tourism in a developing region over time.", topics)).toBeNull();
    expect(matchQuestionToTopic("anything", [])).toBeNull();
  });
});

describe("buildSelfCheckPlan", () => {
  const questions = [
    { questionNumber: "1", questionText: "A car accelerates uniformly from rest. Using the equations of motion, calculate its final velocity and displacement after 8 s.", marks: 3, sourcePageStart: 2, sourcePageEnd: 2 },
    { questionNumber: "2", questionText: "Explain your reasoning.", marks: null, sourcePageStart: 3, sourcePageEnd: 4 },
  ];

  it("turns extracted questions into self-check checkpoints with grounded concepts", () => {
    const plan = buildSelfCheckPlan({ sourceName: "9702_s24_qp_22.pdf", questions, scope: { syllabusId: "cambridge-9702", paper: 2 }, outcomes: rows })!;
    expect(plan.mode).toBe("self_check");
    expect(plan.subject).toBe("Physics");
    expect(plan.title).toBe("9702_s24_qp_22 · self-check");
    expect(plan.blocks).toHaveLength(2);
    const [first, second] = plan.blocks;
    expect(first.id).toBe("q-1");
    expect(first.title).toBe("Question 1 (3 marks)");
    expect(first.interaction.evaluationMode).toBe("self_check");
    expect(first.curriculum).toEqual({ syllabusId: "cambridge-9702", topicKey: "2.1", title: "Kinematics" });
    expect(plan.blocks[1].curriculum).toBeUndefined();
    expect(first.interaction.expectedConcepts.length).toBeGreaterThan(0);
    expect(first.interaction.expectedConcepts.length).toBeLessThanOrEqual(4);
    expect(second.interaction.expectedConcepts).toEqual([]);
    expect(second.interaction.modelAnswer).toContain("mark scheme");
    expect(plan.topics).toEqual(["Kinematics"]);
  });

  it("restricts AS papers to AS content so A Level topics cannot be matched", () => {
    const asPlan = buildSelfCheckPlan({ sourceName: "p.pdf", questions: [{ questionNumber: "1", questionText: "Describe the nature of alpha, beta and gamma radiation and explain what is meant by half-life of a radioactive decay.", marks: 4, sourcePageStart: 1, sourcePageEnd: 1 }], scope: { syllabusId: "cambridge-9702", paper: 2 }, outcomes: rows })!;
    expect(asPlan.blocks[0].interaction.expectedConcepts).toEqual([]);
    const aPlan = buildSelfCheckPlan({ sourceName: "p.pdf", questions: [{ questionNumber: "1", questionText: "Describe the nature of alpha, beta and gamma radiation and explain what is meant by half-life of a radioactive decay.", marks: 4, sourcePageStart: 1, sourcePageEnd: 1 }], scope: { syllabusId: "cambridge-9702", paper: 4 }, outcomes: rows })!;
    expect(aPlan.blocks[0].interaction.expectedConcepts.length).toBeGreaterThan(0);
  });

  it("still works with no syllabus code (no concepts) and returns null when nothing was extracted", () => {
    const plan = buildSelfCheckPlan({ sourceName: "scan.pdf", questions, scope: null, outcomes: [] })!;
    expect(plan.blocks.every((block) => block.interaction.expectedConcepts.length === 0)).toBe(true);
    expect(plan.subject).toBe("");
    expect(buildSelfCheckPlan({ sourceName: "x.pdf", questions: [], scope: null, outcomes: [] })).toBeNull();
  });

  it("caps the session at twelve questions and uses safe block ids", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ questionNumber: `${i + 1}(a)`, questionText: `Question text number ${i + 1} about something`, marks: 1, sourcePageStart: 1, sourcePageEnd: 1 }));
    const plan = buildSelfCheckPlan({ sourceName: "m.pdf", questions: many, scope: null, outcomes: [] })!;
    expect(plan.blocks).toHaveLength(12);
    expect(plan.blocks.every((block) => /^[\w-]+$/.test(block.id))).toBe(true);
  });
});

describe("selfCheckEvaluation", () => {
  it("maps ratings to softer-than-exam evidence and lists the points to review", () => {
    const got = selfCheckEvaluation("got_it", ["Define velocity"]);
    expect(got.verdict).toBe("correct");
    expect(got.evidence).toBe(85);
    expect(got.feedback).toContain("self-assessed");
    const not = selfCheckEvaluation("not_yet", ["Define velocity", "Use v = u + at"]);
    expect(not.verdict).toBe("incorrect");
    expect(not.feedback).toContain("• Define velocity");
    expect(not.feedback).toContain("• Use v = u + at");
    expect(selfCheckEvaluation("unsure", []).verdict).toBe("partially_correct");
  });
});
