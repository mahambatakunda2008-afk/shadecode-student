import { describe, expect, it } from "vitest";
import { mergePaperScoreHistory, parsePaperStatePatch } from "./paperStatePatch";

describe("parsePaperStatePatch", () => {
  it("accepts valid partial state updates", () => {
    expect(parsePaperStatePatch({ status: "completed", score: 75, last_page: 3 })).toEqual({
      patch: { status: "completed", score: 75, last_page: 3 },
    });
  });

  it.each([
    [null, "Request body must be a JSON object"],
    [[], "Request body must be a JSON object"],
    [{ status: "done" }, "status must be not_started, in_progress, or completed"],
    [{ bookmarked: "yes" }, "bookmarked must be a boolean"],
    [{ last_page: -1 }, "last_page must be a non-negative integer"],
    [{ last_page: 1.5 }, "last_page must be a non-negative integer"],
    [{ score: Number.NaN }, "score must be a finite number between 0 and 100"],
    [{ score: 101 }, "score must be a finite number between 0 and 100"],
    [{ time_spent_seconds: -5 }, "time_spent_seconds must be a non-negative finite number"],
    [{ irrelevant: true }, "No valid fields in request"],
  ])("rejects invalid payload %j", (payload, error) => {
    expect(parsePaperStatePatch(payload)).toEqual({ error });
  });
});

describe("mergePaperScoreHistory", () => {
  it("replaces a retry for the same paper instead of duplicating the score", () => {
    const previous = [
      { paper_id: "paper-a", subject: "Physics", score: 40, recorded_at: "2026-01-01T00:00:00.000Z" },
      { paper_id: "paper-b", subject: "Mathematics", score: 80, recorded_at: "2026-01-02T00:00:00.000Z" },
    ];
    expect(mergePaperScoreHistory(previous, "paper-a", "Physics", 55, "2026-01-03T00:00:00.000Z")).toEqual([
      previous[1],
      { paper_id: "paper-a", subject: "Physics", score: 55, recorded_at: "2026-01-03T00:00:00.000Z" },
    ]);
  });

  it("caps the rollup history at the latest 50 entries", () => {
    const previous = Array.from({ length: 50 }, (_, index) => ({
      paper_id: `paper-${index}`,
      subject: "Physics",
      score: index,
      recorded_at: new Date(index).toISOString(),
    }));
    expect(mergePaperScoreHistory(previous, "new-paper", "Chemistry", 70, "2026-02-01T00:00:00.000Z")).toHaveLength(50);
    expect(mergePaperScoreHistory(previous, "new-paper", "Chemistry", 70, "2026-02-01T00:00:00.000Z")[0].paper_id).toBe("paper-1");
  });
});
