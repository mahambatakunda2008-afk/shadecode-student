import { describe, expect, it } from "vitest";
import { describeVerification } from "./verification";

describe("describeVerification", () => {
  it("shows reviewer count and month when both are known", () => {
    expect(describeVerification({ reviewCount: 2, verifiedAt: "2026-03-14T10:00:00Z" })).toBe("Reviewed by 2 teachers · Mar 2026");
  });
  it("uses the singular for one reviewer", () => {
    expect(describeVerification({ reviewCount: 1 })).toBe("Reviewed by a teacher");
  });
  it("falls back to a safe generic line (published always means verified) when details are missing, e.g. offline", () => {
    expect(describeVerification({})).toBe("Checked by a teacher before publishing");
    expect(describeVerification({ reviewCount: 0, verifiedAt: "not a date" })).toBe("Checked by a teacher before publishing");
  });
});
