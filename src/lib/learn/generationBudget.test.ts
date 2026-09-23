import { describe, expect, it } from "vitest";
import { computeRepairBudget } from "./generationBudget";

describe("computeRepairBudget", () => {
  it("gives the repair call its full preferred budget when primary was fast", () => {
    const budget = computeRepairBudget({ elapsedMs: 3000, maxTotalMs: 50000, preferredMaxChainMs: 20000, preferredPerProviderMaxMs: 9000 });
    expect(budget).toEqual({ maxChainMs: 20000, perProviderMaxMs: 9000 });
  });

  it("shrinks the repair budget to whatever is actually left when primary ran long", () => {
    // Primary consumed 40s of a 50s total ceiling; only 10s remains for repair.
    const budget = computeRepairBudget({ elapsedMs: 40000, maxTotalMs: 50000, preferredMaxChainMs: 20000, preferredPerProviderMaxMs: 9000 });
    expect(budget).toEqual({ maxChainMs: 10000, perProviderMaxMs: 9000 });
  });

  it("caps perProviderMaxMs to maxChainMs when the remaining time is very small", () => {
    const budget = computeRepairBudget({ elapsedMs: 44000, maxTotalMs: 50000, preferredMaxChainMs: 20000, preferredPerProviderMaxMs: 9000 });
    expect(budget).toEqual({ maxChainMs: 6000, perProviderMaxMs: 6000 });
  });

  it("returns null (skip repair) when too little time remains to be worthwhile", () => {
    expect(computeRepairBudget({ elapsedMs: 48000, maxTotalMs: 50000, preferredMaxChainMs: 20000, preferredPerProviderMaxMs: 9000 })).toBeNull();
    expect(computeRepairBudget({ elapsedMs: 50000, maxTotalMs: 50000, preferredMaxChainMs: 20000, preferredPerProviderMaxMs: 9000 })).toBeNull();
    expect(computeRepairBudget({ elapsedMs: 90000, maxTotalMs: 50000, preferredMaxChainMs: 20000, preferredPerProviderMaxMs: 9000 })).toBeNull();
  });

  it("respects a custom minViableMs threshold", () => {
    expect(computeRepairBudget({ elapsedMs: 47000, maxTotalMs: 50000, preferredMaxChainMs: 20000, preferredPerProviderMaxMs: 9000, minViableMs: 2000 })).toEqual({ maxChainMs: 3000, perProviderMaxMs: 3000 });
    expect(computeRepairBudget({ elapsedMs: 48500, maxTotalMs: 50000, preferredMaxChainMs: 20000, preferredPerProviderMaxMs: 9000, minViableMs: 2000 })).toBeNull();
  });

  it("never returns a budget that lets primary + repair exceed maxTotalMs", () => {
    for (const elapsedMs of [0, 1000, 15000, 29999, 30000, 45000, 49000]) {
      const budget = computeRepairBudget({ elapsedMs, maxTotalMs: 50000, preferredMaxChainMs: 20000, preferredPerProviderMaxMs: 9000 });
      if (budget) expect(elapsedMs + budget.maxChainMs, `elapsed=${elapsedMs}`).toBeLessThanOrEqual(50000);
    }
  });
});
