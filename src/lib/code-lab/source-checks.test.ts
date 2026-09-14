import { describe, expect, it } from "vitest";
import { evaluateSourceEvidence, sourceTextForChecks } from "./source-checks";

describe("source evidence checks", () => {
  it("ignores README text when checking source evidence", () => {
    const source = sourceTextForChecks([
      { path: "README.md", content: "Use a while loop here." },
      { path: "main.js", content: "console.log('ready');" },
    ]);
    expect(source).not.toContain("Use a while loop here.");
    expect(source).toContain("console.log");
  });

  it("passes a matching structural check", () => {
    const result = evaluateSourceEvidence(
      { pattern: "\\bfor\\s*\\(", message: "Add a for loop." },
      [{ path: "main.js", content: "for (let i = 0; i < 3; i++) console.log(i);" }],
    );
    expect(result.status).toBe("passed");
  });

  it("returns a learner-facing failure when evidence is absent", () => {
    const result = evaluateSourceEvidence(
      { pattern: "\\bif\\s*\\(", message: "Use selection." },
      [{ path: "main.py", content: "print('ready')" }],
    );
    expect(result.status).toBe("failed");
    expect(result.detail).toBe("Use selection.");
  });
});
