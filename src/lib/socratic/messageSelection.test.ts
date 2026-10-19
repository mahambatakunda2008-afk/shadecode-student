import { describe, expect, it } from "vitest";
import type { TutoringMessage } from "./types";
import { getLastStudentAttempt } from "./messageSelection";

function message(
  id: string,
  role: TutoringMessage["role"],
  content: string,
  helpAction = false,
): TutoringMessage {
  return {
    id,
    role,
    content,
    type: role === "tutor" ? "guidance" : "question",
    timestamp: "2026-10-19T00:00:00.000Z",
    ...(helpAction ? { metadata: { helpAction: true } } : {}),
  };
}

describe("getLastStudentAttempt", () => {
  it("ignores quick-help controls when selecting work to analyze", () => {
    const actualAttempt = message("attempt", "student", "I used F = ma and got 12 N.");
    const conversation = [
      actualAttempt,
      message("tutor", "tutor", "Can you show your next step?"),
      message("help", "student", "Show more detail", true),
    ];

    expect(getLastStudentAttempt(conversation)).toBe(actualAttempt);
  });

  it("returns the latest actual student attempt", () => {
    const first = message("first", "student", "I think it is 4.");
    const latest = message("latest", "student", "I recalculated and got 6.");
    expect(getLastStudentAttempt([first, latest])).toBe(latest);
  });

  it("returns undefined when there is no actual student attempt", () => {
    expect(getLastStudentAttempt([
      message("help", "student", "Show worked solution", true),
      message("tutor", "tutor", "Here is the method."),
    ])).toBeUndefined();
  });
});
