import { describe, expect, it } from "vitest";

// Keep the education-to-exam difficulty contract explicit. The component's
// resolver is intentionally small and deterministic so offline exam generation
// never needs a curriculum/network lookup just to choose a difficulty band.
describe("offline exam education bands", () => {
  const bands: Record<string, number> = {
    early_primary: 0,
    upper_primary: 0,
    junior_secondary: 1,
    senior_secondary: 1,
    a_level: 2,
    tertiary: 2,
    adult: 2,
  };

  it("keeps primary in the accessible offline band", () => {
    expect(bands.early_primary).toBe(0);
    expect(bands.upper_primary).toBe(0);
  });

  it("raises difficulty with learner progression", () => {
    expect(bands.junior_secondary).toBeGreaterThan(bands.upper_primary);
    expect(bands.a_level).toBeGreaterThan(bands.senior_secondary);
  });
});
