import { describe, expect, it } from "vitest";
import { buildIntentInstruction, resolveLearningIntent } from "../learningIntent";

describe("learning intent resolver", () => {
  it("detects remediation requests", () => {
    expect(resolveLearningIntent("I keep getting moments wrong").intent).toBe("remediate");
  });

  it("detects exam preparation", () => {
    expect(resolveLearningIntent("I have a physics exam tomorrow").intent).toBe("exam-prep");
  });

  it("detects practice requests", () => {
    expect(resolveLearningIntent("Give me questions on differentiation").intent).toBe("practice");
  });

  it("treats test me as practice rather than exam preparation", () => {
    expect(resolveLearningIntent("Test me on calculus").intent).toBe("practice");
  });

  it("detects guided solving", () => {
    expect(resolveLearningIntent("Help me solve this mechanics question").intent).toBe("guided-solve");
  });

  it("gives explicit prompt intent precedence over a generic goal", () => {
    expect(resolveLearningIntent("Test me on differentiation", "Prepare for an exam").intent).toBe("practice");
  });

  it("uses the selected goal when the prompt is generic", () => {
    expect(resolveLearningIntent("Teach me differentiation", "Fix a weak area").intent).toBe("remediate");
    expect(resolveLearningIntent("Teach me differentiation", "Practice questions").intent).toBe("practice");
    expect(resolveLearningIntent("Teach me differentiation", "Review quickly").intent).toBe("review");
  });

  it("does not classify an ordinary word like wrong as remediation by itself", () => {
    expect(resolveLearningIntent("What is the wrong sign convention here?").intent).toBe("learn");
  });

  it("defaults to direct learning", () => {
    expect(resolveLearningIntent("Teach me deformation of solids").intent).toBe("learn");
  });

  it("produces intent-specific teaching direction", () => {
    const result = resolveLearningIntent("I know nothing about recursion from scratch");
    expect(result.intent).toBe("from-scratch");
    expect(buildIntentInstruction(result)).toContain("prerequisite ladder");
  });
});