import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("device-only generated lesson sync", () => {
  it("places locally generated lessons in the durable pending-sync query", () => {
    const client = read("src/lib/cortex/lessonGenerationClient.ts");
    const start = client.indexOf("async function saveLocalResult");
    const end = client.indexOf("function parseLocalModelLesson", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(client.slice(start, end)).toMatch(/syncStatus:\s*"pending"/);
  });

  it("keeps pending and retry-needed lessons discoverable after an app restart", () => {
    const storage = read("src/lib/offline/storage.ts");
    expect(storage).toMatch(/lesson\.syncStatus === "pending" \|\| lesson\.syncStatus === "retry-needed"/);
    expect(storage).toMatch(/indexedDB\.open\(DB_NAME, DB_VERSION\)/);
  });
});
