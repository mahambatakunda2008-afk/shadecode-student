import { describe, expect, it } from "vitest";
import { getRuntimeProvider, getRuntimeProviderForLanguage } from "./providers";
import { executeCode } from "./index";

describe("Comp Lab runtime routing", () => {
  it("routes browser languages to real browser providers", () => {
    expect(getRuntimeProviderForLanguage("javascript").id).toBe("browser-javascript");
    expect(getRuntimeProviderForLanguage("typescript").id).toBe("typescript-transpiler");
    expect(getRuntimeProviderForLanguage("python").id).toBe("python");
    expect(getRuntimeProviderForLanguage("sql").id).toBe("sql");
    expect(getRuntimeProviderForLanguage("pseudocode").id).toBe("pseudocode-interpreter");
  });

  it("does not claim native languages are browser-executable", async () => {
    expect(getRuntimeProvider("csharp").id).toBe("dotnet");
    const result = await executeCode({ id: "routing-test", language: "csharp", code: "Console.WriteLine(1);", entryFile: "main.cs" });
    expect(result.exitCode).not.toBe(0);
    expect(result.diagnostics[0]?.severity).toBe("info");
  });
});
