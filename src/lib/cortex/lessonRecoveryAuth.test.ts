import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("Learn library recovery authentication", () => {
  const client = read("src/lib/cortex/lessonGenerationClient.ts");

  it("forwards the active bearer token to both recovery endpoints", () => {
    expect(client).toMatch(/if \(token\) headers\.Authorization = `Bearer \$\{token\}`/);
    expect(client).toMatch(/fetchLibraryRecovery\(currentJob\.request\.subject, currentJob\.request\.prompt, "\/api\/library\/recover", 6000, token\)/);
    expect(client).toMatch(/fetchLibraryRecovery\(currentJob\.request\.subject, currentJob\.request\.prompt, "\/api\/library\/guide", 9000, token\)/);
  });

  it("does not cache recovery responses", () => {
    expect(client).toMatch(/headers,\s*cache: "no-store"/);
  });
});
