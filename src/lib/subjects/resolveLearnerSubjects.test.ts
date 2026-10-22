import { describe, expect, it } from "vitest";
import { assertRequestedLearnerSubject, type LearnerSubject } from "./resolveLearnerSubjects";

const learnerSubjects: LearnerSubject[] = [
  { id: "math-id", name: "Mathematics" },
  { id: "physics-id", name: "AS Level Physics" },
];

describe("assertRequestedLearnerSubject", () => {
  it("allows only a canonical subject selected by the learner", () => {
    expect(assertRequestedLearnerSubject(learnerSubjects, "Mathematics")?.id).toBe("math-id");
    expect(assertRequestedLearnerSubject(learnerSubjects, "  as   level physics ")?.id).toBe("physics-id");
  });

  it.each(["Geography", "Computer Science", "General", "all", "", null, undefined])(
    "fails closed for unselected or broad subject request %s",
    (requested) => {
      expect(assertRequestedLearnerSubject(learnerSubjects, requested)).toBeNull();
    },
  );

  it("does not grant access when the learner has no selected subjects", () => {
    expect(assertRequestedLearnerSubject([], "Mathematics")).toBeNull();
  });
});
