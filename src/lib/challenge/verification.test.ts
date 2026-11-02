import { describe, expect, it } from "vitest";
import { battleTrust, normaliseMarking } from "./verification";

describe("normaliseMarking", () => {
  it("only trusts the exact value 'server'", () => {
    expect(normaliseMarking("server")).toBe("server");
    for (const v of ["client", "SERVER", "", null, undefined, true, 1]) expect(normaliseMarking(v)).toBe("client");
  });
});

describe("battleTrust", () => {
  it("verifies server-marked battles only", () => {
    expect(battleTrust("server").attemptVerified).toBe(true);
    expect(battleTrust("client").attemptVerified).toBe(false);
  });
  it("never uses the word verified for self-reported papers", () => {
    const t = battleTrust("client");
    expect(`${t.badge} ${t.note}`.toLowerCase()).not.toMatch(/verified marking|can.t be edited/);
  });
});
