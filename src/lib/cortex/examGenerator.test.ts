import { describe, expect, it } from "vitest";
import { topicMatchesAny } from "./examGenerator";

describe("topicMatchesAny", () => {
  it("accepts a question assigned to any one of the selected topics", () => {
    const topics = ["Kinematics", "Forces", "Momentum"];
    expect(topicMatchesAny(topics, "Forces", "Calculate the resultant force on the object.")).toBe(true);
    expect(topicMatchesAny(topics, "Momentum", "Determine the change in momentum.")).toBe(true);
  });

  it("rejects questions assigned to an unselected neighbouring topic", () => {
    expect(topicMatchesAny(["Kinematics", "Forces"], "Energy", "Calculate the gravitational potential energy.")).toBe(false);
  });

  it("uses the question text when the model omits its topic label", () => {
    expect(topicMatchesAny(["Kinematics", "Forces"], "", "Use kinematics to calculate acceleration from the change in velocity.")).toBe(true);
    expect(topicMatchesAny(["Kinematics", "Forces"], "", "Explain the structure of an ionic lattice.")).toBe(false);
  });

  it("keeps an empty topic selection unrestricted", () => {
    expect(topicMatchesAny([], "Organic chemistry", "Explain electrophilic addition.")).toBe(true);
  });

  it("preserves parent and child topic matching", () => {
    expect(topicMatchesAny(["Mechanics"], "Mechanics: Kinematics", "Calculate acceleration.")).toBe(true);
    expect(topicMatchesAny(["Kinematics: SUVAT"], "Kinematics", "Use SUVAT equations.")).toBe(true);
  });
});
