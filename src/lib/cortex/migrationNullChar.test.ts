import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const dir = path.join(process.cwd(), "supabase", "migrations");

describe("migrations never use chr(0)", () => {
  it("the latest definition of the lesson completion bridge uses a legal separator", () => {
    // PostgreSQL text cannot contain U+0000: chr(0) raises "null character not permitted" at runtime.
    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    const bridgeFiles = files.filter((f) => readFileSync(path.join(dir, f), "utf8").includes("bridge_learn_lesson_completion_to_cortex_event"));
    const latest = readFileSync(path.join(dir, bridgeFiles[bridgeFiles.length - 1]), "utf8");
    const body = latest.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    expect(body).not.toMatch(/chr\(\s*0\s*\)/i);
  });
});
