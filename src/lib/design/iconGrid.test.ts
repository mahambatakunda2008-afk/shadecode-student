import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("icon size grid", () => {
  it("keeps lucide icons on even pixel sizes so strokes stay crisp", () => {
    const script = path.join(process.cwd(), "scripts", "snap-icon-sizes.mjs");
    const out = execFileSync("node", [script, "--check"], { encoding: "utf8" });
    // If this fails, run: node scripts/snap-icon-sizes.mjs
    expect(out).toContain("would change 0 icon size(s)");
  });
});
