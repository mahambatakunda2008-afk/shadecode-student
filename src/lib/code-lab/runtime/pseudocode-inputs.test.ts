import { describe, expect, it } from "vitest";
import { runPseudocode } from "./pseudocode";

describe("pseudocode runtime inputs", () => {
  it("consumes supplied inputs in order", async () => {
    const result = await runPseudocode({
      id: "input-order",
      language: "pseudocode",
      code: [
        "INPUT first",
        "INPUT second",
        "OUTPUT first",
        "OUTPUT second",
      ].join("\n"),
      inputs: ["Ada", "42"],
    });

    expect(result.exitCode).toBe(0);
    const stdout = result.events.find((event) => event.type === "stdout");
    expect(stdout?.type).toBe("stdout");
    if (stdout?.type === "stdout") {
      expect(stdout.text).toContain("Ada");
      expect(stdout.text).toContain("42");
    }
  });

  it("does not fabricate missing input", async () => {
    const result = await runPseudocode({
      id: "missing-input",
      language: "pseudocode",
      code: "INPUT answer\nOUTPUT answer",
      inputs: [],
    });

    expect(result.exitCode).toBe(0);
    const stdout = result.events.find((event) => event.type === "stdout");
    expect(stdout?.type).toBe("stdout");
    if (stdout?.type === "stdout") expect(stdout.text).toContain("\n");
  });
});
