import { describe, expect, it } from "vitest";
import { builtInCapacity, buildGuaranteedExam } from "./guaranteedExam";

describe("builtInCapacity", () => {
  it("reports how many questions a single curated topic can fill", () => {
    expect(builtInCapacity("History", "French Revolution", "easy")).toBe(9);
    expect(builtInCapacity("History", "First Chimurenga", "easy")).toBe(8);
    expect(builtInCapacity("Geography", "rivers", "easy")).toBe(10);
    expect(builtInCapacity("Biology", "enzymes", "easy")).toBe(10);
  });

  it("is generous for a whole-syllabus request", () => {
    expect(builtInCapacity("Geography", "", "easy")!).toBeGreaterThanOrEqual(100);
    expect(builtInCapacity("History", "History", "easy")!).toBeGreaterThanOrEqual(120);
    expect(builtInCapacity("Biology", "Biology (A-Level)".replace(/ \(.*\)/, ""), "medium")!).toBeGreaterThanOrEqual(60);
  });

  it("splits comma-separated topics into equal shares limited by the smallest topic", () => {
    expect(builtInCapacity("Geography", "rivers, weather", "easy")).toBe(20);
    expect(builtInCapacity("History", "French Revolution, First Chimurenga", "easy")).toBe(16);
    expect(builtInCapacity("History", "chimurenga", "easy")).toBe(19);
  });

  it("does not cap engine-generated topics or topics left to AI", () => {
    expect(builtInCapacity("Mathematics", "percentages", "easy")).toBeNull();
    expect(builtInCapacity("Physics", "kinematics", "medium")).toBeNull();
    expect(builtInCapacity("Accounting", "double entry", "easy")).toBeNull();
    expect(builtInCapacity("Geography", "rivers", "medium")).toBeNull();
    expect(builtInCapacity("Geography", "quantum entanglement of isotopes", "easy")).toBeNull();
  });

  it("agrees with what the builder can actually produce", () => {
    const cases: [string, string][] = [["History", "French Revolution"], ["History", "chimurenga"], ["Geography", "rivers"], ["Geography", "rivers, weather"], ["Biology", "enzymes"], ["Biology", "mitosis"]];
    for (const [subject, topic] of cases) {
      const capacity = builtInCapacity(subject, topic, "easy")!;
      expect(capacity, `${subject}/${topic}`).not.toBeNull();
      const single = !topic.includes(",");
      if (single) {
        const paper = buildGuaranteedExam(subject, topic, "easy", Math.min(capacity, 20));
        expect(paper?.questions.length, `${subject}/${topic}`).toBe(Math.min(capacity, 20));
        expect(buildGuaranteedExam(subject, topic, "easy", 20)?.questions.length).toBe(Math.min(capacity, 20));
      }
    }
  });
});
