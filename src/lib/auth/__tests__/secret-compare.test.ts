import { describe, expect, it } from "vitest";
import { secretsMatch } from "../secret-compare";

describe("secretsMatch", () => {
  it("matches identical secrets", () => {
    expect(secretsMatch("s3cret-Token_123", "s3cret-Token_123")).toBe(true);
  });

  it("rejects different secrets, including different lengths and prefixes", () => {
    expect(secretsMatch("s3cret", "s3cret-longer")).toBe(false);
    expect(secretsMatch("s3cret-longer", "s3cret")).toBe(false);
    expect(secretsMatch("S3CRET", "s3cret")).toBe(false);
    expect(secretsMatch("x", "y")).toBe(false);
  });

  it("fails closed when the expected secret is missing or empty", () => {
    // Regression: a `Bearer ${process.env.ADMIN_SECRET}` comparison used to become "Bearer undefined".
    expect(secretsMatch("undefined", undefined)).toBe(false);
    expect(secretsMatch("null", null)).toBe(false);
    expect(secretsMatch("", "")).toBe(false);
    expect(secretsMatch("anything", "")).toBe(false);
  });

  it("fails closed when nothing is presented", () => {
    expect(secretsMatch(undefined, "s3cret")).toBe(false);
    expect(secretsMatch(null, "s3cret")).toBe(false);
    expect(secretsMatch("", "s3cret")).toBe(false);
  });

  it("handles non-ASCII secrets without throwing", () => {
    expect(secretsMatch("pässwörd-🔑", "pässwörd-🔑")).toBe(true);
    expect(secretsMatch("pässwörd-🔑", "passwörd-🔑")).toBe(false);
  });
});
