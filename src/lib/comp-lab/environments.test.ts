import { describe, expect, it } from "vitest";
import { findCompLabEnvironmentForPath, getCompLabEnvironment, isExecutableCompLabLanguage } from "./environments";

describe("Comp Lab environment registry", () => {
  it("resolves the pseudocode environment", () => {
    expect(getCompLabEnvironment("pseudocode")?.label).toBe("Pseudocode & Algorithms");
    expect(findCompLabEnvironmentForPath("algorithms/lesson.pseudocode")?.id).toBe("pseudocode");
  });

  it("distinguishes browser-executable languages from external runtimes", () => {
    expect(isExecutableCompLabLanguage("pseudocode")).toBe(true);
    expect(isExecutableCompLabLanguage("python")).toBe(true);
    expect(isExecutableCompLabLanguage("csharp")).toBe(false);
  });
});
