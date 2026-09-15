import { describe, expect, it } from "vitest";
import { runPseudocode } from "./pseudocode";

describe("pseudocode runtime", () => {
  const request = (code: string, inputs: string[] = []) => runPseudocode({
    id: "test",
    language: "pseudocode",
    code,
    entryFile: "main.pseudo",
    inputs,
    timeoutMs: 2000,
  });

  it("executes input, assignment and output", async () => {
    const result = await request("INPUT A\nINPUT B\nTotal <- A + B\nOUTPUT Total", ["7", "5"]);
    expect(result.exitCode).toBe(0);
    expect(result.events.some((event) => event.type === "stdout" && event.text.trim() === "12")).toBe(true);
  });

  it("handles selection and iteration", async () => {
    const result = await request([
      "INPUT N",
      "Total <- 0",
      "FOR I <- 1 TO N",
      "  IF I MOD 2 = 0 THEN",
      "    Total <- Total + I",
      "  END IF",
      "END FOR",
      "OUTPUT Total",
    ].join("\n"), ["6"]);
    expect(result.exitCode).toBe(0);
    expect(result.events.some((event) => event.type === "stdout" && event.text.trim() === "12")).toBe(true);
  });

  it("supports arrays and indexed access", async () => {
    const result = await request([
      "DECLARE Values AS ARRAY",
      "FOR I <- 1 TO 3",
      "  INPUT X",
      "  Values[I] <- X",
      "END FOR",
      "Total <- Values[1] + Values[2] + Values[3]",
      "OUTPUT Total",
    ].join("\n"), ["4", "5", "6"]);
    expect(result.exitCode).toBe(0);
    expect(result.events.some((event) => event.type === "stdout" && event.text.trim() === "15")).toBe(true);
  });

  it("handles REPEAT UNTIL and CASE branches", async () => {
    const result = await request([
      "INPUT N",
      "Count <- 0",
      "REPEAT",
      "  Count <- Count + 1",
      "UNTIL Count = N",
      "CASE Count OF",
      "  3:",
      "    OUTPUT \"three\"",
      "  OTHERWISE:",
      "    OUTPUT \"other\"",
      "END CASE",
    ].join("\n"), ["3"]);
    expect(result.exitCode).toBe(0);
    expect(result.events.some((event) => event.type === "stdout" && event.text.trim() === "three")).toBe(true);
  });

  it("supports procedures with parameters and RETURN", async () => {
    const result = await request([
      "FUNCTION Add(A, B)",
      "  RETURN A + B",
      "END FUNCTION",
      "CALL Add(8, 4)",
      "OUTPUT __return",
    ].join("\n"));
    expect(result.exitCode).toBe(0);
    expect(result.events.some((event) => event.type === "stdout" && event.text.trim() === "12")).toBe(true);
  });

  it("emits a diagnostic for an unsupported statement", async () => {
    const result = await request("MAGIC THING");
    expect(result.exitCode).not.toBe(0);
    expect(result.diagnostics.some((diagnostic) => diagnostic.message.includes("Unsupported pseudocode statement"))).toBe(true);
  });
});
