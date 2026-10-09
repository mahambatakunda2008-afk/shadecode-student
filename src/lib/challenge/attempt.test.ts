import { describe, expect, it } from "vitest";
import { didWin, validateAttempt } from "./attempt";

const base = { challenge_id: "3f2b8c1e-aaaa-bbbb-cccc-1234567890ab", percentage: 72, total_score: 18, max_score: 25, time_taken: 420, grade: "B" };

describe("validateAttempt", () => {
  it("accepts a well-formed attempt", () => {
    expect(validateAttempt(base)).toMatchObject({ percentage: 72, totalScore: 18, maxScore: 25, timeTaken: 420, grade: "B" });
  });
  it("rejects impossible scores", () => {
    expect(validateAttempt({ ...base, percentage: 140 })).toBeNull();
    expect(validateAttempt({ ...base, total_score: 30 })).toBeNull();
    expect(validateAttempt({ ...base, percentage: "NaN" })).toBeNull();
  });
  it("rejects malformed ids and tolerates a missing time", () => {
    expect(validateAttempt({ ...base, challenge_id: "x'; drop table" })).toBeNull();
    expect(validateAttempt({ ...base, time_taken: undefined })?.timeTaken).toBeNull();
    expect(validateAttempt({ ...base, time_taken: 999999 })?.timeTaken).toBeNull();
  });
});

describe("integer columns", () => {
  it("rounds fractional values because the attempts table stores whole numbers", () => {
    const result = validateAttempt({ ...base, percentage: 72.4, total_score: 17.6, max_score: 25, time_taken: 419.5 });
    expect(result).toMatchObject({ percentage: 72, totalScore: 18, maxScore: 25, timeTaken: 420 });
  });
});

describe("didWin", () => {
  it("requires strictly beating the stored score", () => {
    expect(didWin(80, 79)).toBe(true);
    expect(didWin(79, 79)).toBe(false);
  });
});
