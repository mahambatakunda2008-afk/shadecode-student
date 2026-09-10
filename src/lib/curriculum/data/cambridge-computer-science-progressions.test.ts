import { describe, expect, it } from "vitest";
import { progressionForScope } from "./cambridge-computer-science-progression";
import { CAMBRIDGE_CANDIDATE_SCOPES } from "./cambridge-computer-science-candidate-content";

function verifiedScope(syllabusId: string) {
  const scope = CAMBRIDGE_CANDIDATE_SCOPES.find((item) => item.identity.syllabusId === syllabusId);
  if (!scope) throw new Error(`Missing Cambridge scope: ${syllabusId}`);
  return { ...scope, complete: true, verified: true };
}

describe("Cambridge Computer Science progression", () => {
  it("fails closed for draft candidate scopes", () => {
    const scope = CAMBRIDGE_CANDIDATE_SCOPES.find((item) => item.identity.syllabusId === "cambridge-0478");
    expect(scope).toBeDefined();
    expect(progressionForScope(scope!)).toEqual([]);
  });

  it("returns only verified progression for an exact 0478 identity", () => {
    expect(progressionForScope(verifiedScope("cambridge-0478"))).toEqual([]);
  });

  it("keeps 0984 separate from 0478", () => {
    const scope = verifiedScope("cambridge-0984");
    expect(scope.identity.syllabusId).toBe("cambridge-0984");
    expect(scope.identity.syllabusVersion).toBe("2026-2028");
    expect(progressionForScope(scope)).toEqual([]);
  });

  it("does not accidentally apply IGCSE progression to 9618", () => {
    const scope = verifiedScope("cambridge-9618");
    expect(progressionForScope(scope)).toEqual([]);
  });
});
