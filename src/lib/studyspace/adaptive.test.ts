import { describe, expect, it } from "vitest";
import { recommendNextActions } from "./adaptive";
import type { WorkObject } from "./types";

const base: WorkObject = {
  id: "w1",
  mode: "assessment",
  subject: "Agricultural Science",
  topic: "Soil fertility",
  assessment: { percentage: 42, weakAreas: ["Soil fertility", "Nutrient cycles"] },
  createdAt: "2026-08-18T00:00:00.000Z",
  updatedAt: "2026-08-18T00:00:00.000Z",
};

describe("recommendNextActions", () => {
  it("turns weak areas into targeted lessons", () => {
    const actions = recommendNextActions(base);
    expect(actions[0]).toMatchObject({ type: "lesson", topic: "Soil fertility", priority: "high" });
  });

  it("works with arbitrary subjects", () => {
    const actions = recommendNextActions({ ...base, subject: "Shona", assessment: { percentage: 50, weakAreas: ["Literature analysis"] } });
    expect(actions[0].subject).toBe("Shona");
    expect(actions[0].topic).toBe("Literature analysis");
  });

  it("suggests harder practice after strong performance", () => {
    const actions = recommendNextActions({ ...base, assessment: { percentage: 91, weakAreas: [] } });
    expect(actions[0].type).toBe("practice");
  });
});
