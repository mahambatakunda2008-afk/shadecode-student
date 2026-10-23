import { describe, expect, it } from "vitest";
import { CortexMemory } from "../memory";

describe("CortexMemory search isolation", () => {
  it("returns no results when the learner scope is omitted", () => {
    const memory = new CortexMemory();
    memory.save("learner-a", "What is photosynthesis?", "Answer A");
    memory.save("learner-b", "What is photosynthesis?", "Answer B");

    expect(memory.search("What is photosynthesis?")).toEqual([]);
  });

  it("returns only entries belonging to the requested learner", () => {
    const memory = new CortexMemory();
    memory.save("learner-a", "What is photosynthesis?", "Answer A");
    memory.save("learner-b", "What is photosynthesis?", "Answer B");

    const results = memory.search("What is photosynthesis?", "learner-a");
    expect(results).toHaveLength(1);
    expect(results[0]?.userId).toBe("learner-a");
    expect(results[0]?.answer).toBe("Answer A");
  });
});
