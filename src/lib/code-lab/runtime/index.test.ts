import { describe, expect, it } from "vitest";
import { executeCode } from "./index";

describe("Comp Lab runtime routing", () => {
  it("executes the browser-backed language paths", async () => {
    const javascript = await executeCode({ id: "js-routing", language: "javascript", code: "console.log('ok')", entryFile: "main.js" });
    expect(javascript.exitCode).toBe(0);

    const typescript = await executeCode({ id: "ts-routing", language: "typescript", code: "const answer: number = 42; console.log(answer);", entryFile: "main.ts" });
    expect(typescript.exitCode).toBe(0);

    const python = await executeCode({ id: "py-routing", language: "python", code: "print(2 + 3)", entryFile: "main.py" });
    expect(python.exitCode).toBe(0);

    const sql = await executeCode({ id: "sql-routing", language: "sql", code: "select 2 + 3 as answer;", entryFile: "main.sql" });
    expect(sql.exitCode).toBe(0);
  });

  it("does not claim native languages are browser-executable", async () => {
    const result = await executeCode({ id: "routing-test", language: "csharp", code: "Console.WriteLine(1);", entryFile: "main.cs" });
    expect(result.exitCode).not.toBe(0);
    expect(result.diagnostics[0]?.severity).toBe("info");
  });
});
