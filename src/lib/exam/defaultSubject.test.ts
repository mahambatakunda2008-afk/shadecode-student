import { describe, expect, it } from "vitest";
import { defaultExamSubject } from "./defaultSubject";

describe("defaultExamSubject", () => {
  it("returns nothing when the learner has no usable subjects", () => {
    expect(defaultExamSubject(undefined)).toBe("");
    expect(defaultExamSubject(null)).toBe("");
    expect(defaultExamSubject([])).toBe("");
    expect(defaultExamSubject([42, "", "  "])).toBe("");
  });
  it("uses the learner's first real subject", () => {
    const first = defaultExamSubject(["Physics", "Mathematics"]);
    expect(first.toLowerCase()).toContain("physics");
  });
  it("skips non-strings and blanks before choosing", () => {
    expect(defaultExamSubject([null, "  ", "Chemistry"]).toLowerCase()).toContain("chemistry");
  });
});
