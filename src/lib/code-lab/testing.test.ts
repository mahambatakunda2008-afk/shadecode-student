import { describe, expect, it } from "vitest";
import { resolveTestCode } from "./testing";

describe("resolveTestCode", () => {
  it("injects the workspace entry file into a test harness", () => {
    expect(resolveTestCode('import "{{ENTRY_FILE}}";\nconsole.log("checked");', "src/main.js")).toBe(
      'import "./src/main.js";\nconsole.log("checked");',
    );
  });

  it("normalizes Windows separators and strips a leading slash", () => {
    expect(resolveTestCode("import '{{ENTRY_FILE}}';", "\\src\\app\\main.js")).toBe(
      "import './src/app/main.js';",
    );
  });

  it("leaves ordinary standalone test programs unchanged", () => {
    expect(resolveTestCode("console.log('standalone');", "main.js")).toBe("console.log('standalone');");
  });
});
