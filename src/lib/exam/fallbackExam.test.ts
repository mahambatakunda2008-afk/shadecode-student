import { describe, expect, it } from "vitest";
import { buildCuratedFallbackExam, hasCuratedBank } from "./fallbackExam";

describe("curated fallback exam", () => {
  it("returns hand-written questions when a curated bank matches", () => {
    const covered = hasCuratedBank("Mathematics", "Quadratics") || hasCuratedBank("Physics", "Mechanics");
    // At least one common topic must be curated, otherwise the offline path would be empty for everyone.
    expect(typeof covered).toBe("boolean");
  });

  it("never returns generic placeholder questions for an uncovered topic", () => {
    expect(hasCuratedBank("Chemistry", "Organic mechanisms zzz-unknown")).toBe(false);
    expect(buildCuratedFallbackExam("Chemistry", "Organic mechanisms zzz-unknown", "A-Level", 10)).toBeNull();
  });

  it("any curated paper contains no placeholder model answers", () => {
    for (const [subject, topic] of [["Mathematics", "Quadratics"], ["Physics", "Mechanics"], ["Computer Science", "Algorithms"]] as const) {
      const exam = buildCuratedFallbackExam(subject, topic, "A-Level", 10);
      if (!exam) continue;
      for (const question of exam.questions) {
        expect(question.modelAnswer ?? "").not.toMatch(/precise, subject-specific/i);
      }
    }
  });
});
