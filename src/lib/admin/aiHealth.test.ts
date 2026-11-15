import { describe, expect, it } from "vitest";
import { normalizeFailure, summarizeAiHealth, type AiLogRow } from "./aiHealth";

const now = new Date("2026-11-15T12:00:00Z");
const row = (feature: string, success: boolean, user: string | null, at: string, extra: Partial<AiLogRow> = {}): AiLogRow => ({ feature, success, user_id: user, created_at: at, ...extra });

describe("normalizeFailure", () => {
  it("groups equal failures regardless of numbers and json detail", () => {
    expect(normalizeFailure("Hard timeout: provider did not respond within its 6000ms budget")).toBe(normalizeFailure("Hard timeout: provider did not respond within its 15842ms budget"));
    expect(normalizeFailure('Gemini HTTP 503: {\n "error": {"code": 503}}')).toBe("Gemini HTTP N:");
    expect(normalizeFailure(null)).toBe("unknown error");
    expect(normalizeFailure("   ")).toBe("unknown error");
  });
});

describe("summarizeAiHealth", () => {
  const rows = [
    row("lesson", false, "a", "2026-11-14T10:00:00Z", { latency_ms: 6000, error_message: "Hard timeout 6000ms" }),
    row("lesson", false, "a", "2026-11-14T10:00:07Z", { latency_ms: 8000, error_message: "Hard timeout 9000ms" }),
    row("lesson", true, "b", "2026-11-14T11:00:00Z"),
    row("lesson", false, "c", "2026-11-14T12:00:00Z", { latency_ms: 4000, error_message: "Empty or unusable AI response" }),
    row("exam", true, "a", "2026-11-13T09:00:00Z"),
    row("lesson", false, "a", "2026-10-01T09:00:00Z"), // outside the window
    row("lesson", false, "zz", "not-a-date"),
  ];
  const r = summarizeAiHealth(rows, now);
  const lesson = r.find((x) => x.feature === "lesson")!;
  it("counts attempts, successes and the rate inside the window only", () => {
    expect(lesson.attempts).toBe(4);
    expect(lesson.succeeded).toBe(1);
    expect(lesson.successPct).toBe(25);
  });
  it("finds students who never got a success and the average time they waited", () => {
    expect(lesson.students).toBe(3);
    expect(lesson.studentsWithoutSuccess).toBe(2); // a and c
    expect(lesson.avgFailSeconds).toBe(6); // (6000+8000+4000)/3 ms
  });
  it("reports the most common normalised failure", () => {
    expect(lesson.topFailure).toBe("Hard timeout Nms (2×)");
  });
  it("orders busiest first and handles an empty log", () => {
    expect(r[0].feature).toBe("lesson");
    expect(summarizeAiHealth([], now)).toEqual([]);
  });
});
