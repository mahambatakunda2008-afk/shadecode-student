import { describe, expect, it } from "vitest";
import { MAX_TOPIC_CHARS, applyTeachingApproach, topicTooLongMessage, topicWithoutApproach } from "./teachingApproach";

const exam = "Teach this topic to Cambridge exam standard. Include essential definitions, derivations where relevant, a worked exam-style question, mark-scheme reasoning, and a short test.";
const pack = "Build a revision pack for the topic I enter, matched to my subject, level, syllabus, and exam board where known. Choose the most useful formats for this topic, such as concise notes, definitions, diagrams, worked examples, flashcards, practice questions, and an answer key. Do not invent syllabus facts or evidence; flag anything that needs verification.";

describe("applyTeachingApproach", () => {
  it("adds one approach after the topic", () => {
    const r = applyTeachingApproach("Particle Physics", exam);
    expect(r.fits).toBe(true);
    expect(r.text).toBe(`Particle Physics\n\nTeaching approach: ${exam}`);
  });
  it("REPLACES a previous approach instead of stacking (the 586-char bug)", () => {
    const once = applyTeachingApproach("Particle Physics", exam).text;
    const twice = applyTeachingApproach(once, pack);
    expect(twice.fits).toBe(true);
    expect(twice.text).toBe(`Particle Physics\n\nTeaching approach: ${pack}`);
    expect(twice.text.match(/Teaching approach:/g)).toHaveLength(1);
    expect(twice.text.length).toBeLessThanOrEqual(MAX_TOPIC_CHARS);
  });
  it("stays within the limit no matter how many times styles are switched", () => {
    let text = "Waves";
    for (let i = 0; i < 12; i++) text = applyTeachingApproach(text, i % 2 ? pack : exam).text;
    expect(text.length).toBeLessThanOrEqual(MAX_TOPIC_CHARS);
    expect(text.startsWith("Waves")).toBe(true);
  });
  it("never cuts the student's topic: if the style cannot fit, text is unchanged", () => {
    const longTopic = "x".repeat(300);
    const r = applyTeachingApproach(longTopic, pack);
    expect(r.fits).toBe(false);
    expect(r.text).toBe(longTopic);
  });
  it("uses the prompt alone when the box is empty", () => {
    expect(applyTeachingApproach("   ", exam)).toEqual({ text: exam, fits: true });
  });
});

describe("topicWithoutApproach / message", () => {
  it("recovers the student's own topic", () => {
    expect(topicWithoutApproach(`Kinematics\n\nTeaching approach: ${exam}`)).toBe("Kinematics");
    expect(topicWithoutApproach("Kinematics")).toBe("Kinematics");
  });
  it("explains the problem in plain words", () => {
    expect(topicTooLongMessage(586)).toContain("586/500");
  });
});
