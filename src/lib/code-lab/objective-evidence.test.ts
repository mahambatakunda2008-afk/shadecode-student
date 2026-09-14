import { describe, expect, it } from "vitest";
import { buildObjectiveEvidenceChecks, evaluateObjectiveEvidence } from "./objective-evidence";

describe("objective evidence engine", () => {
  it("detects a loop objective", () => {
    const objective = {
      id: "loop-1",
      title: "Use iteration",
      description: "Use loops to repeat processing",
      topic: "Iteration",
    };
    const checks = buildObjectiveEvidenceChecks(objective);
    const results = evaluateObjectiveEvidence(checks, [
      { path: "main.js", content: "for (let i = 0; i < 3; i++) console.log(i);" },
    ]);
    expect(results.some((result) => result.status === "passed")).toBe(true);
  });

  it("fails structural evidence when the required construct is absent", () => {
    const objective = {
      id: "selection-1",
      title: "Use selection",
      description: "Make decisions with if and else",
      topic: "Selection",
    };
    const checks = buildObjectiveEvidenceChecks(objective);
    const results = evaluateObjectiveEvidence(checks, [
      { path: "main.js", content: "console.log('hello');" },
    ]);
    expect(results.some((result) => result.status === "failed")).toBe(true);
  });
});
