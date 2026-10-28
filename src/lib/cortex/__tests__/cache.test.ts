import { afterEach, describe, expect, it } from "vitest";
import { ResponseCache, generateCacheKey } from "../cache";

describe("lesson response cache recovery", () => {
  let cache: ResponseCache | undefined;

  afterEach(() => {
    cache?.destroy();
    cache = undefined;
  });

  it("uses a reusable key when callers omit a learner ID", () => {
    const first = generateCacheKey("Physics::Waves", "intermediate", "explanation");
    const second = generateCacheKey("Physics::Waves", "intermediate", "explanation");

    expect(first).toBe(second);
    expect(first).not.toContain("user-");
  });

  it("evicts only the invalid entry and preserves other valid lessons", async () => {
    cache = new ResponseCache();
    await cache.set("lesson:physics:waves", JSON.stringify({ title: "Waves" }), "lesson");
    await cache.set("lesson:maths:calculus", JSON.stringify({ title: "Calculus" }), "lesson");

    await cache.delete("lesson:physics:waves");

    expect(await cache.get("lesson:physics:waves")).toBeNull();
    expect(await cache.get("lesson:maths:calculus")).toContain("Calculus");
    expect(cache.getAllKeys()).toEqual(["lesson:maths:calculus"]);
  });
});
