import { describe, expect, it } from "vitest";
import { runBrowserSql, runBrowserTypeScript } from "./browser-polyglot";

const browserAvailable = typeof Worker !== "undefined" && typeof Blob !== "undefined" && typeof URL !== "undefined";

describe.skipIf(!browserAvailable)("browser polyglot runtimes", () => {
  it("transpiles and executes TypeScript without treating it as JavaScript source", async () => {
    const result = await runBrowserTypeScript({ id: "typescript-test", language: "typescript", code: "const value: number = 21 * 2; console.log(value);", entryFile: "main.ts", timeoutMs: 5000 });
    expect(result.exitCode).toBe(0);
    expect(result.events.some((event) => event.type === "stdout" && event.text.includes("42"))).toBe(true);
  });

  it("reports TypeScript compiler diagnostics", async () => {
    const result = await runBrowserTypeScript({ id: "typescript-error", language: "typescript", code: "const value: number = 'not a number';", entryFile: "main.ts", timeoutMs: 5000 });
    expect(result.exitCode).not.toBe(0);
    expect(result.diagnostics.some((diagnostic) => diagnostic.source === "compiler")).toBe(true);
  });

  it("executes SQL against an isolated in-memory database", async () => {
    const result = await runBrowserSql({ id: "sql-test", language: "sql", code: "CREATE TABLE students (name TEXT, mark INTEGER); INSERT INTO students VALUES ('A', 80), ('B', 90); SELECT AVG(mark) AS average FROM students;", entryFile: "main.sql", timeoutMs: 5000 });
    expect(result.exitCode).toBe(0);
    expect(result.events.some((event) => event.type === "stdout" && event.text.includes("85"))).toBe(true);
  });
});
