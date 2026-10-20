import { describe, expect, it } from "vitest";
import { buildPresentationGuidance } from "./presentationGuidance";

describe("buildPresentationGuidance", () => {
  it("provides universal quality rules without forcing a story format", () => {
    const guidance = buildPresentationGuidance("History", "Industrial Revolution");
    expect(guidance).toContain("UNIVERSAL LEARNING QUALITY CONTRACT");
    expect(guidance).toContain("do not assume every learner is preparing for the same exam");
    expect(guidance).toContain("Avoid filler, repetitive conclusions, forced stories");
    expect(guidance).not.toContain("GEOGRAPHY CASE-STUDY ADD-ON");
  });

  it("adds mathematics-specific solution quality", () => {
    const guidance = buildPresentationGuidance("Mathematics", "Differentiation");
    expect(guidance).toContain("MATHEMATICS ADD-ON");
    expect(guidance).toContain("intermediate steps");
    expect(guidance).not.toContain("PHYSICS ADD-ON");
  });

  it("adds physics-specific units, derivations, and practical reasoning", () => {
    const guidance = buildPresentationGuidance("Physics", "Waves");
    expect(guidance).toContain("PHYSICS ADD-ON");
    expect(guidance).toContain("SI units");
    expect(guidance).toContain("uncertainty");
  });

  it("adds Computer Science practical structures", () => {
    const guidance = buildPresentationGuidance("Computer Science", "Algorithms");
    expect(guidance).toContain("COMPUTER SCIENCE ADD-ON");
    expect(guidance).toContain("trace tables");
    expect(guidance).toContain("boundary/error cases");
  });

  it("adds evidence-conscious Geography guidance only when relevant", () => {
    const guidance = buildPresentationGuidance("Geography", "24 case studies for O-Level revision");
    expect(guidance).toContain("GEOGRAPHY CASE-STUDY ADD-ON");
    expect(guidance).toContain("location and context; process/issue; causes; impacts; management/response; outcomes; evidence; exam application");
    expect(guidance).toContain("VERIFY BEFORE MEMORISING");
    expect(guidance).toContain("do not replace the list with invented cases");
  });

  it("does not trigger the case-study add-on for an ordinary Geography topic", () => {
    expect(buildPresentationGuidance("Geography", "Weather and climate")).not.toContain("GEOGRAPHY CASE-STUDY ADD-ON");
  });
});
