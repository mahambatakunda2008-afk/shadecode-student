import { describe, expect, it } from "vitest";
import { finalLessonTitle } from "./lessonGenerationClient";

describe("finalLessonTitle", () => {
  it("replaces the in-progress shell title with the topic", () => {
    expect(finalLessonTitle("Cortex is building Kinematics", "Kinematics")).toBe("Kinematics");
    expect(finalLessonTitle("", "Kinematics")).toBe("Kinematics");
    expect(finalLessonTitle(undefined, "Kinematics")).toBe("Kinematics");
  });
  it("keeps a real generated title", () => {
    expect(finalLessonTitle("Kinematics: Motion Described", "Kinematics")).toBe("Kinematics: Motion Described");
  });
});
