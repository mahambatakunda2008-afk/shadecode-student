import { describe, expect, it } from "vitest";
import { chooseNextAction, mapTopicMasteryRow } from "./nextAction";

describe("Cortex next-action engine", () => {
  it("prioritizes prerequisite repair over generic practice", () => {
    const decision = chooseNextAction([
      mapTopicMasteryRow({
        subject: "Physics",
        topic: "Moments",
        mastery_score: 42,
        retention: 45,
        error_rate: 40,
        prerequisite_health: 30,
        uncertainty: 60,
        attempts: 4,
      }),
      mapTopicMasteryRow({
        subject: "Mathematics",
        topic: "Quadratics",
        mastery_score: 48,
        retention: 55,
        error_rate: 30,
        prerequisite_health: 70,
        uncertainty: 50,
        attempts: 5,
      }),
    ]);

    expect(decision?.kind).toBe("repair-prerequisite");
    expect(decision?.topic).toBe("Moments");
    expect(decision?.evidence.some((item) => item.signal === "prerequisite health")).toBe(true);
  });

  it("chooses retrieval when mastery is acceptable but retention is weak", () => {
    const decision = chooseNextAction([
      mapTopicMasteryRow({
        subject: "Computer Science",
        topic: "Data Structures",
        mastery_score: 68,
        retention: 42,
        error_rate: 15,
        prerequisite_health: 75,
        uncertainty: 60,
        attempts: 8,
      }),
    ]);

    expect(decision?.kind).toBe("retrieval-check");
    expect(decision?.successCheck).toContain("learning observation");
  });

  it("returns null when no learner evidence exists", () => {
    expect(chooseNextAction([])).toBeNull();
  });
});
