import { describe, expect, it } from "vitest";
import { ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_SCOPE } from "./zimsec-o-level-computer-science-4021-candidate-scope";

const active = ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_SCOPE.content.filter((item) => item.status !== "archived");

describe("ZIMSEC 4021 candidate content scope", () => {
  it("contains the four-form topic hierarchy", () => {
    const forms = new Set(
      active
        .map((item) => item.metadata?.form)
        .filter((value): value is number => typeof value === "number"),
    );
    expect(forms).toEqual(new Set([1, 2, 3, 4]));
  });

  it("contains knowledge beneath topics rather than only objectives", () => {
    expect(active.some((item) => item.kind === "topic")).toBe(true);
    expect(active.some((item) => item.kind === "knowledge" && item.parentId)).toBe(true);
    expect(active.some((item) => item.kind === "objective")).toBe(true);
  });

  it("cannot become production-ready from the candidate source alone", () => {
    expect(ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_SCOPE.complete).toBe(false);
    expect(ZIMSEC_O_LEVEL_CS_4021_CANDIDATE_SCOPE.verified).toBe(false);
  });
});
