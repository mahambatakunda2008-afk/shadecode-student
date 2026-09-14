import { describe, expect, it } from "vitest";
import { buildProjectDiagnostics } from "./project-diagnostics";

describe("buildProjectDiagnostics", () => {
  it("reports unresolved relative imports", () => {
    const diagnostics = buildProjectDiagnostics([
      { path: "main.js", content: 'import "./missing.js";' },
    ]);

    expect(diagnostics.some((item) => item.message.includes("./missing.js"))).toBe(true);
    expect(diagnostics[0]?.source).toBe("language");
  });

  it("reports circular dependencies", () => {
    const diagnostics = buildProjectDiagnostics([
      { path: "a.js", content: 'import "./b.js";' },
      { path: "b.js", content: 'import "./a.js";' },
    ]);

    expect(diagnostics.some((item) => item.message.includes("Circular dependency"))).toBe(true);
  });

  it("does not report a valid relative import", () => {
    const diagnostics = buildProjectDiagnostics([
      { path: "main.js", content: 'import "./utils.js";' },
      { path: "utils.js", content: "export const value = 1;" },
    ]);

    expect(diagnostics).toHaveLength(0);
  });
});
