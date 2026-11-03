import { describe, expect, it } from "vitest";
import { buildCuratedFallbackExam, hasCuratedBank } from "../fallbackExam";
import { isValidGeneratedPaper } from "../paperValidation";
import { BIOLOGY_TOPICS, biologyBank, matchBiologyTopics } from "./biology";

const all = BIOLOGY_TOPICS.flatMap((entry) => entry.questions.map((q) => ({ ...q, topic: entry.topic })));

describe("Biology curated bank integrity", () => {
  it("has a useful amount of content across topics", () => {
    expect(BIOLOGY_TOPICS.length).toBeGreaterThanOrEqual(8);
    expect(all.length).toBeGreaterThanOrEqual(70);
    for (const entry of BIOLOGY_TOPICS) expect(entry.questions.length).toBeGreaterThanOrEqual(8);
  });
  it("every question has four distinct options and exactly one matching answer", () => {
    for (const q of all) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(4);
      expect(q.options.filter((o) => o === q.answer)).toHaveLength(1);
      expect(q.question.trim().length).toBeGreaterThanOrEqual(12);
    }
  });
  it("has no duplicate questions", () => {
    const texts = all.map((q) => q.question.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });
  it("does not always put the answer in the same position", () => {
    const counts = [0, 0, 0, 0];
    for (const q of all) counts[q.options.indexOf(q.answer)] += 1;
    for (const count of counts) expect(count / all.length).toBeGreaterThan(0.12);
  });
  it("contains only plain ASCII so it renders identically everywhere", () => {
    for (const q of all) expect(`${q.question}${q.options.join("")}`).toMatch(/^[\x20-\x7e]*$/);
  });
});

describe("Biology topic matching", () => {
  it("matches specific topics by whole word", () => {
    expect(matchBiologyTopics("enzymes").map((t) => t.topic)).toEqual(["Biological molecules and enzymes"]);
    expect(matchBiologyTopics("Photosynthesis").map((t) => t.topic)).toEqual(["Plant nutrition and transport"]);
    expect(matchBiologyTopics("mitosis and meiosis").map((t) => t.topic)).toEqual(["Cell division"]);
  });
  it("treats broad requests as the whole syllabus, not a substring accident", () => {
    expect(matchBiologyTopics("general revision")).toHaveLength(BIOLOGY_TOPICS.length);
    expect(matchBiologyTopics("core concepts")).toHaveLength(BIOLOGY_TOPICS.length);
    expect(matchBiologyTopics("")).toHaveLength(BIOLOGY_TOPICS.length);
    expect(matchBiologyTopics("Biology")).toHaveLength(BIOLOGY_TOPICS.length);
  });
  it("returns nothing for an uncovered topic so callers can be honest", () => {
    expect(matchBiologyTopics("Biotechnology and genetic engineering of crops zzz")).not.toHaveLength(0); // genetic matches DNA topic
    expect(matchBiologyTopics("Zoology of rare reptiles")).toHaveLength(0);
    expect(biologyBank("Zoology of rare reptiles")).toBeNull();
  });
});

describe("Biology fallback papers", () => {
  it("builds valid papers of every offered size from a broad request", () => {
    for (const count of [5, 10, 15, 20]) {
      const exam = buildCuratedFallbackExam("Biology", "core concepts", "A-Level", count);
      expect(exam).not.toBeNull();
      expect(exam!.questions).toHaveLength(count);
      expect(isValidGeneratedPaper(exam!.questions.map((q, i) => ({ ...q, id: i + 1 })), count)).toBe(true);
    }
  });
  it("samples several topics in a short broad paper and labels each question's topic", () => {
    const exam = buildCuratedFallbackExam("Biology", "core concepts", "A-Level", 8)!;
    expect(new Set(exam.questions.map((q) => q.topic)).size).toBe(8);
    expect(exam.topics.length).toBe(8);
  });
  it("keeps a single-topic paper on that topic and retakes are not identical", () => {
    const first = buildCuratedFallbackExam("Biology", "enzymes", "A-Level", 10)!;
    expect(first.questions.every((q) => q.topic === "Biological molecules and enzymes")).toBe(true);
    const orders = new Set(Array.from({ length: 12 }, () => buildCuratedFallbackExam("Biology", "enzymes", "A-Level", 10)!.questions.map((q) => q.question).join("|")));
    expect(orders.size).toBeGreaterThan(1);
  });
  it("every question's model answer is one of its options", () => {
    const exam = buildCuratedFallbackExam("Biology", "core concepts", "A-Level", 20)!;
    for (const q of exam.questions) expect(q.options).toContain(q.modelAnswer);
  });
  it("is reported as covered, while other subjects stay honest", () => {
    expect(hasCuratedBank("Biology", "cell division")).toBe(true);
    expect(hasCuratedBank("Biology", "Zoology of rare reptiles")).toBe(false);
    expect(hasCuratedBank("Geography", "rivers")).toBe(false);
  });
});
