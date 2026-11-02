import { describe, expect, it } from "vitest";
import { PUBLIC_RESULT_COLUMNS, formatDuration, isResultId, resultShareText, toPublicResult } from "./publicResult";

const row = {
  subject: "Physics", topic: "Waves", difficulty: "A-Level", score: 72, total_questions: 10,
  correct_answers: 7, time_taken: 640, created_at: "2026-10-20T10:00:00.000Z",
};

describe("toPublicResult", () => {
  it("projects only the public fields", () => {
    expect(toPublicResult(row)).toEqual({
      subject: "Physics", topic: "Waves", difficulty: "A-Level", percentage: 72, correct: 7,
      total: 10, grade: "B", timeSeconds: 640, completedAt: "2026-10-20T10:00:00.000Z",
    });
  });
  it("never carries private columns even if the query is widened", () => {
    const wide = { ...row, user_id: "u-1", weak_areas: ["Optics"], user_name: "Tendai", email: "a@b.c" };
    const json = JSON.stringify(toPublicResult(wide));
    for (const secret of ["u-1", "Optics", "Tendai", "a@b.c", "user_id", "weak_areas"]) expect(json).not.toContain(secret);
  });
  it("allow-list excludes private columns", () => {
    expect(PUBLIC_RESULT_COLUMNS).not.toMatch(/user_id|weak_areas|name|email/);
  });
  it("returns null for missing or impossible rows", () => {
    expect(toPublicResult(null)).toBeNull();
    expect(toPublicResult({ ...row, score: 140 })).toBeNull();
    expect(toPublicResult({ ...row, subject: "" })).toBeNull();
  });
  it("tolerates a bad timestamp and missing time", () => {
    const r = toPublicResult({ ...row, created_at: "nope", time_taken: null });
    expect(r?.completedAt).toBeNull();
    expect(r?.timeSeconds).toBeNull();
  });
});

describe("isResultId", () => {
  it("accepts uuids and rejects everything else", () => {
    expect(isResultId("0b0d6b1e-4f7a-4c1e-9a55-2f6f3f1f9a10")).toBe(true);
    for (const bad of ["", "123", "../etc", "0b0d6b1e-4f7a-4c1e-9a55-2f6f3f1f9a10 ", null, undefined, 5]) expect(isResultId(bad)).toBe(false);
  });
});

describe("formatDuration / share text", () => {
  it("formats m:ss and hides unknown", () => {
    expect(formatDuration(640)).toBe("10:40");
    expect(formatDuration(5)).toBe("0:05");
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(-1)).toBeNull();
  });
  it("share text carries score and link but no personal data", () => {
    const r = toPublicResult(row)!;
    const text = resultShareText(r, "https://x.test/results/abc");
    expect(text).toContain("7/10");
    expect(text).toContain("https://x.test/results/abc");
  });
});
