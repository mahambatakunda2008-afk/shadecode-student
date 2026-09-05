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

  it("detects guided solving", () => {
    expect(resolveLearningIntent("Help me solve this mechanics question").intent).toBe("guided-solve");
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
