import { describe, expect, it } from "vitest";
import { actionLink } from "./next-action";
import type { ProfileRecommendation } from "./profile-adaptive";

const recommendation = (action: ProfileRecommendation["action"]): ProfileRecommendation => ({
  action,
  subject: "Mathematics",
  topic: "Integration",
  reason: "Target this topic",
  priority: "high",
});

describe("adaptive action links", () => {
  it.each([
    ["lesson", "/learn", "Start targeted lesson"],
    ["practice", "/practice", "Start practice"],
    ["challenge", "/exam-sim", "Take a challenge"],
    ["workmate", "/workmate", "Work with Workmate"],
  ] as const)("routes %s into StudySpace", (action, path, label) => {
    const link = actionLink(recommendation(action));
    expect(link.href).toContain(path);
    expect(link.href).toContain("subject=Mathematics");
    expect(link.href).toContain("topic=Integration");
    expect(link.href).toContain("source=adaptive");
    expect(link.label).toBe(label);
  });
});
