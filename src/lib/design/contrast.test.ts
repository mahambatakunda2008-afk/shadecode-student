import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("design token contrast", () => {
  it("keeps every text/background token pair at WCAG AA in light and dark themes", () => {
    const script = path.join(process.cwd(), "scripts", "audit-contrast.mjs");
    // Throws (non-zero exit) and prints the failing pairs if any token change drops below 4.5:1.
    const out = execFileSync("node", [script], { encoding: "utf8" });
    expect(out).toContain("0 failing pair(s)");
  });
});
