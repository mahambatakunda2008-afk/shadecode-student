import { describe, expect, it } from "vitest";
import { firstStepHref, parseFirstStep } from "./firstStep";

const ok = { available: true, subject: "Physics", objective: { title: "Kinematics: speed and velocity", topic: "Kinematics", description: "Define speed, velocity and acceleration." } };

describe("parseFirstStep", () => {
  it("reads a verified objective", () => {
    expect(parseFirstStep(ok)).toEqual({ subject: "Physics", topic: "Kinematics", title: "Kinematics: speed and velocity", description: "Define speed, velocity and acceleration." });
  });
  it("falls back to the title when there is no topic and trims long descriptions", () => {
    const step = parseFirstStep({ ...ok, objective: { title: "Forces", description: "x".repeat(400) } });
    expect(step?.topic).toBe("Forces");
    expect(step?.description?.length).toBeLessThanOrEqual(140);
    expect(step?.description?.endsWith("…")).toBe(true);
  });
  it("never invents a step when the curriculum is not available or incomplete", () => {
    expect(parseFirstStep(null)).toBeNull();
    expect(parseFirstStep({ available: false, reason: "CURRICULUM_UNVERIFIED" })).toBeNull();
    expect(parseFirstStep({ available: true, objective: { title: "Forces" } })).toBeNull();
    expect(parseFirstStep({ ...ok, objective: { topic: "Forces" } })).toBeNull();
    expect(parseFirstStep({ ...ok, objective: null })).toBeNull();
  });
});

describe("firstStepHref", () => {
  it("encodes subject and topic for /learn", () => {
    expect(firstStepHref({ subject: "Computer Science", topic: "Data & types", title: "t", description: null })).toBe("/learn?subject=Computer%20Science&topic=Data%20%26%20types");
  });
});
