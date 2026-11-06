import { describe, expect, it } from "vitest";
import { buildCuratedFallbackExam, hasCuratedBank } from "../fallbackExam";
import { isValidGeneratedPaper } from "../paperValidation";
import { GEOGRAPHY_TOPICS, geographyBank, matchGeographyTopics } from "./geography";

const all = GEOGRAPHY_TOPICS.flatMap((entry) => entry.questions.map((q) => ({ ...q, topic: entry.topic })));

describe("Geography curated bank integrity", () => {
  it("covers the syllabus sections with a useful amount of content", () => {
    expect(GEOGRAPHY_TOPICS.length).toBeGreaterThanOrEqual(11);
    expect(all.length).toBeGreaterThanOrEqual(100);
    for (const entry of GEOGRAPHY_TOPICS) expect(entry.questions.length, entry.topic).toBeGreaterThanOrEqual(7);
  });
  it("every question has four distinct options and exactly one matching answer", () => {
    for (const q of all) {
      expect(q.options, q.question).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.toLowerCase())).size, q.question).toBe(4);
      expect(q.options.filter((o) => o === q.answer), q.question).toHaveLength(1);
      expect(q.question.trim().length).toBeGreaterThanOrEqual(8);
    }
  });
  it("has no duplicate questions", () => {
    const texts = all.map((q) => q.question.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });
  it("does not always put the answer in the same position", () => {
    const counts = [0, 0, 0, 0];
    for (const q of all) counts[q.options.indexOf(q.answer)] += 1;
    for (const count of counts) expect(count / all.length).toBeGreaterThan(0.15);
  });
  it("is plain ASCII and never contains a dollar sign (maths delimiter in the exam UI)", () => {
    for (const q of all) {
      const text = `${q.question}${q.options.join("")}`;
      expect(text).toMatch(/^[\x20-\x7e]*$/);
      expect(text).not.toContain("$");
    }
  });
  it("keeps numeric options in their natural order", () => {
    const time = all.find((q) => q.question.startsWith("When it is 12:00 noon"))!;
    expect(time.options).toEqual(["10:00", "12:30", "13:00", "14:00"]);
    expect(time.answer).toBe("14:00");
  });
});

describe("Geography topic matching", () => {
  it("matches the syllabus sections by word", () => {
    expect(matchGeographyTopics("rivers").map((t) => t.topic)).toContain("Rivers");
    expect(matchGeographyTopics("Weather and climate").map((t) => t.topic)).toContain("Weather and climate");
    expect(matchGeographyTopics("map work").map((t) => t.topic)).toContain("Map skills");
    expect(matchGeographyTopics("time zones").map((t) => t.topic)).toContain("Transport, time and trade");
    expect(matchGeographyTopics("urbanisation").map((t) => t.topic)).toContain("Settlement and population");
    expect(matchGeographyTopics("desertification").map((t) => t.topic)).toContain("Hot deserts and desertification");
  });
  it("treats the subject name and generic words as the whole syllabus", () => {
    for (const text of ["", "Geography", "core concepts", "general revision"]) expect(matchGeographyTopics(text), text).toHaveLength(GEOGRAPHY_TOPICS.length);
  });
  it("returns nothing for an uncovered topic so callers stay honest", () => {
    expect(geographyBank("Quantum entanglement of rare isotopes")).toBeNull();
  });
});

describe("Geography is O-Level only", () => {
  it("is available for O-Level and when no level is given, but not for A-Level or University", () => {
    expect(hasCuratedBank("Geography", "rivers", "easy")).toBe(true);
    expect(hasCuratedBank("Geography", "rivers")).toBe(true);
    expect(hasCuratedBank("Geography", "rivers", "medium")).toBe(false);
    expect(hasCuratedBank("Geography", "rivers", "hard")).toBe(false);
    expect(buildCuratedFallbackExam("Geography", "rivers", "medium", 10)).toBeNull();
  });
  it("does not change other subjects' availability by level", () => {
    expect(hasCuratedBank("Biology", "enzymes", "easy")).toBe(true);
    expect(hasCuratedBank("Biology", "enzymes", "medium")).toBe(true);
  });
});

describe("Geography papers", () => {
  it("builds valid papers of every offered size from a broad request", () => {
    for (const count of [5, 10, 15, 20]) {
      const exam = buildCuratedFallbackExam("Geography", "Geography", "easy", count)!;
      expect(exam).not.toBeNull();
      expect(exam.questions).toHaveLength(count);
      expect(isValidGeneratedPaper(exam.questions.map((q, i) => ({ ...q, id: i + 1 })), count)).toBe(true);
      for (const q of exam.questions) expect(q.options).toContain(q.modelAnswer);
    }
  });
  it("samples the whole syllabus in a short broad paper, labelling each question's section", () => {
    const exam = buildCuratedFallbackExam("Geography", "Geography", "easy", 11)!;
    expect(new Set(exam.questions.map((q) => q.topic)).size).toBe(11);
  });
  it("keeps a single-section paper on that section, and a 20-question section request returns what exists", () => {
    const exam = buildCuratedFallbackExam("Geography", "rivers", "easy", 20)!;
    expect(exam.questions.every((q) => q.topic === "Rivers")).toBe(true);
    expect(exam.questions.length).toBe(10);
  });
});
