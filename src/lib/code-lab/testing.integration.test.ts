import { describe, expect, it } from "vitest";
import { runCodeLabTests } from "./testing";

const browserAvailable = typeof Worker !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined";

describe.skipIf(!browserAvailable)("Comp Lab browser integration", () => {
  it("runs a JavaScript test harness against the workspace entry file", async () => {
    const result = await runCodeLabTests({
      language: "javascript",
      files: [{ path: "main.js", content: "export function add(a, b) { return a + b; }" }],
      entryFile: "main.js",
      tests: [{ id: "add", name: "adds two numbers", code: 'import { add } from "{{ENTRY_FILE}}";\nconsole.log(add(2, 3));', expectedOutput: "5" }],
    });
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.errors).toBe(0);
    expect(result.results[0]?.status).toBe("passed");
  });

  it("distinguishes wrong output from runtime errors", async () => {
    const result = await runCodeLabTests({
      language: "javascript",
      files: [{ path: "main.js", content: "export const value = 7;" }],
      entryFile: "main.js",
      tests: [
        { id: "wrong-output", name: "wrong expected value", code: 'import { value } from "{{ENTRY_FILE}}";\nconsole.log(value);', expectedOutput: "8" },
        { id: "runtime-error", name: "runtime failure", code: 'import "{{ENTRY_FILE}}";\nthrow new Error("boom");', expectedOutput: "" },
      ],
    });
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors).toBe(1);
    expect(result.results.map((item) => item.status)).toEqual(["failed", "error"]);
  });
});
