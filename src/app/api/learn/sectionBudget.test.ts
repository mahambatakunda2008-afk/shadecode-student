import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("section generation time budget", () => {
  const route = read("src/app/api/learn/route.ts");
  const client = read("src/lib/cortex/lessonGenerationClient.ts");

  it("keeps the worst case (first attempt + two repairs) inside the client's wait and the route's maxDuration", () => {
    const m = route.match(/maxChainMs: attempt === 0 \? (\d+) : (\d+), perProviderMaxMs: (\d+), shareChainBudget: true/);
    expect(m, "section call must opt in to shareChainBudget with literal budgets").not.toBeNull();
    const [first, repair, perProvider] = [Number(m![1]), Number(m![2]), Number(m![3])];
    // The runtime caps shared-provider calls at 10s. Keep enough room for structured answers
    // without allowing a single provider attempt to consume the full chain budget.
    expect(perProvider).toBeGreaterThanOrEqual(8000);
    expect(perProvider).toBeLessThanOrEqual(10000);
    const worstCase = first + 2 * repair; // the loop makes at most 3 attempts
    const clientWait = Number(client.match(/const CLOUD_GENERATION_TIMEOUT_MS = ([\d_]+);/)![1].replace(/_/g, ""));
    const maxDuration = Number(route.match(/export const maxDuration = (\d+);/)![1]) * 1000;
    // Leave headroom for session, curriculum grounding and checkpoint writes around the model calls.
    expect(worstCase, `worst case ${worstCase}ms vs client wait ${clientWait}ms`).toBeLessThanOrEqual(clientWait - 6000);
    expect(worstCase).toBeLessThanOrEqual(maxDuration - 20000);
  });

  it("declares maxDuration and the client wait as plain numbers (so this guard cannot silently stop checking)", () => {
    expect(route).toMatch(/export const maxDuration = \d+;/);
    expect(client).toMatch(/const CLOUD_GENERATION_TIMEOUT_MS = [\d_]+;/);
  });
});
