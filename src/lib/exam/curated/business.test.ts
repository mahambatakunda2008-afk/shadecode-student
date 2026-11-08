import { describe, expect, it } from "vitest";
import { buildCuratedFallbackExam, hasCuratedBank } from "../fallbackExam";
import { builtInCapacity } from "../guaranteedExam";
import { BUSINESS_TOPICS, businessBank, matchBusinessTopics } from "./business";

const all = BUSINESS_TOPICS.flatMap((entry) => entry.questions.map((q) => ({ ...q, topic: entry.topic })));
const names = (text: string) => matchBusinessTopics(text).map((t) => t.topic);

describe("Business curated bank integrity", () => {
  it("covers the shared Form 1-4 business topics with a useful amount of content", () => {
    expect(BUSINESS_TOPICS.length).toBeGreaterThanOrEqual(12);
    expect(all.length).toBeGreaterThanOrEqual(130);
    for (const entry of BUSINESS_TOPICS) expect(entry.questions.length, entry.topic).toBeGreaterThanOrEqual(10);
  });
  it("every question has four distinct options and exactly one matching answer", () => {
    for (const q of all) {
      expect(q.options, q.question).toHaveLength(4);
      expect(new Set(q.options).size, q.question).toBe(4);
      expect(q.options.filter((o) => o === q.answer), q.question).toHaveLength(1);
    }
  });
  it("does not always put the answer in the same position", () => {
    const counts = [0, 0, 0, 0];
    for (const q of all) counts[q.options.indexOf(q.answer)] += 1;
    for (const count of counts) expect(count / all.length).toBeGreaterThan(0.15);
  });
  it("is plain ASCII and never uses a dollar sign (money is written as dollars)", () => {
    for (const q of all) {
      const text = `${q.question}${q.options.join("")}`;
      expect(text).toMatch(/^[\x20-\x7e]*$/);
      expect(text).not.toContain("$");
    }
  });
  it("gets the arithmetic right and keeps numeric options in order", () => {
    const revenue = all.find((q) => q.question.startsWith("A business sells 200 items at 5 dollars each"))!;
    expect(revenue.answer).toBe(`${200 * 5} dollars`);
    expect(revenue.options).toEqual(["200 dollars", "500 dollars", "1000 dollars", "1500 dollars"]);
    const profit = all.find((q) => q.question.startsWith("Revenue of 1000 dollars and total costs of 700 dollars"))!;
    expect(profit.answer).toBe(`${1000 - 700} dollars`);
  });
  it("never uses an exact tax rate, which changes over time", () => {
    for (const q of all) expect(`${q.question} ${q.options.join(" ")}`, q.question).not.toMatch(/\b\d+(\.\d+)?\s?%/);
  });
});

describe("Business topic matching", () => {
  it("maps single topics to their own section", () => {
    expect(names("marketing")).toEqual(["Marketing"]);
    expect(names("marketing mix")).toEqual(["Marketing"]);
    expect(names("partnership")).toEqual(["Forms of business ownership"]);
    expect(names("wholesalers and retailers")).toEqual(["Trade and distribution"]);
    expect(names("insurance")).toEqual(["Banking, money and insurance"]);
    expect(names("break-even")).toEqual(["Business finance and costs"]);
    expect(names("trade unions")).toEqual(["People in business"]);
    expect(names("tariffs and quotas")).toEqual(["International trade"]);
  });
  it("prefers specific phrases over shared words", () => {
    expect(names("factors of production")).toEqual(["Business activity and enterprise"]);
    expect(names("production")).toEqual(["Production and value addition"]);
    expect(names("international trade")).toEqual(["International trade"]);
    expect(names("business environment")).toEqual(["Business environment, ethics and ICT"]);
  });
  it("treats the subject name and generic words as the whole syllabus, and is honest about the rest", () => {
    for (const text of ["", "Business", "Business Studies", "Commerce", "core concepts", "general revision"]) expect(matchBusinessTopics(text), text).toHaveLength(BUSINESS_TOPICS.length);
    expect(businessBank("Photosynthesis in leaves")).toBeNull();
  });
});

describe("Business and Commerce are Form 1-4 only", () => {
  it("is served for the Form 1-4 business subjects at O-Level, not at A-Level", () => {
    for (const subject of ["Business Studies", "Commerce", "Business Enterprise Skills", "Business"]) {
      expect(hasCuratedBank(subject, "marketing", "easy"), subject).toBe(true);
      expect(hasCuratedBank(subject, "marketing", "medium"), subject).toBe(false);
      expect(hasCuratedBank(subject, "marketing", "hard"), subject).toBe(false);
    }
  });
  it("is not served for higher-level subjects", () => {
    for (const subject of ["Business Management", "Economics", "Accounting", "Entrepreneurship"]) expect(hasCuratedBank(subject, "marketing", "easy"), subject).toBe(false);
  });
});

describe("Business papers", () => {
  it("builds full papers of every offered size from a broad request", () => {
    for (const count of [5, 10, 15, 20]) {
      const exam = buildCuratedFallbackExam("Business Studies", "Business Studies", "easy", count)!;
      expect(exam.questions).toHaveLength(count);
      for (const q of exam.questions) expect(q.options).toContain(q.modelAnswer);
    }
  });
  it("samples every topic in a 12-question broad paper", () => {
    const exam = buildCuratedFallbackExam("Commerce", "Commerce", "easy", 12)!;
    expect(new Set(exam.questions.map((q) => q.topic)).size).toBe(12);
  });
  it("reports capacity for a single topic and a broad request", () => {
    expect(builtInCapacity("Commerce", "marketing", "easy")).toBe(12);
    expect(builtInCapacity("Business Studies", "", "easy")!).toBeGreaterThanOrEqual(130);
    expect(builtInCapacity("Business Studies", "marketing", "medium")).toBeNull();
  });
});
