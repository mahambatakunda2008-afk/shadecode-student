import { describe, expect, it } from "vitest";
import { bearerToken, secretsMatch } from "../secret-compare";

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
    // Regression: `Bearer ${process.env.ADMIN_SECRET}` used to become "Bearer undefined".
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

describe("bearerToken", () => {
  it("extracts the token from a Bearer header (case-insensitive scheme)", () => {
    expect(bearerToken("Bearer abc123")).toBe("abc123");
    expect(bearerToken("bearer abc123")).toBe("abc123");
    expect(bearerToken("  Bearer   abc123  ")).toBe("abc123");
  });

  it("returns null for missing or non-bearer headers", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken("")).toBeNull();
    expect(bearerToken("Basic abc123")).toBeNull();
    expect(bearerToken("Bearer")).toBeNull();
  });
});
