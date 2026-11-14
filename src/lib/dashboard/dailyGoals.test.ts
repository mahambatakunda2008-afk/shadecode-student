import { describe, expect, it } from "vitest";
import { buildDailyGoals, daysUntilExam } from "./dailyGoals";

const now = new Date(2026, 10, 14, 10, 0, 0); // 14 Nov 2026, local
const lesson = (over = {}) => ({ lessonId: "l1", lessonTitle: "Newton's Laws", subject: "Physics", progress: 60, completed: false, lastAttempted: "2026-11-13T09:00:00Z", ...over });

describe("daysUntilExam", () => {
  it("counts calendar days and handles bad input", () => {
    expect(daysUntilExam("2026-11-14", now)).toBe(0);
    expect(daysUntilExam("2026-11-15", now)).toBe(1);
    expect(daysUntilExam("2026-11-21", now)).toBe(7);
    expect(daysUntilExam("2026-11-10", now)).toBe(-4);
    expect(daysUntilExam("soon", now)).toBeNull();
  });
});

describe("buildDailyGoals", () => {
  it("returns nothing for a new student with no data", () => {
    expect(buildDailyGoals({ lessons: [], exams: [], recommendations: [], now })).toEqual([]);
  });

  it("puts an urgent exam first, then the half-finished lesson", () => {
    const goals = buildDailyGoals({
      lessons: [lesson()], exams: [{ id: "e1", subject: "Chemistry", exam_date: "2026-11-18" }], recommendations: [], now,
    });
    expect(goals.map((g) => g.kind)).toEqual(["exam_prep", "finish_lesson"]);
    expect(goals[0].title).toBe("Chemistry exam in 4 days");
    expect(goals[0].href).toBe("/exam-sim?subject=Chemistry&count=10");
    expect(goals[1]).toMatchObject({ title: "Finish Newton's Laws", detail: "Physics · 60% done", href: "/learn/l1" });
  });

  it("ignores past exams, far-off exams and finished or untouched lessons", () => {
    const goals = buildDailyGoals({
      lessons: [lesson({ completed: true }), lesson({ lessonId: "l2", progress: 0 }), lesson({ lessonId: "l3", progress: 100 })],
      exams: [{ id: "a", subject: "Maths", exam_date: "2026-11-10" }, { id: "b", subject: "Biology", exam_date: "2027-03-01" }],
      recommendations: [], now,
    });
    expect(goals).toEqual([]);
  });

  it("picks the most recently attempted unfinished lesson and one goal per exam subject", () => {
    const goals = buildDailyGoals({
      lessons: [lesson({ lessonId: "old", lessonTitle: "Old", lastAttempted: "2026-10-01T00:00:00Z" }), lesson({ lessonId: "new", lessonTitle: "New" })],
      exams: [{ id: "1", subject: "Physics", exam_date: "2026-11-20" }, { id: "2", subject: "physics", exam_date: "2026-11-25" }],
      recommendations: [], now, limit: 5,
    });
    expect(goals.filter((g) => g.kind === "exam_prep")).toHaveLength(1);
    expect(goals.find((g) => g.kind === "finish_lesson")?.title).toBe("Finish New");
  });

  it("fills with recommendations without repeating the lesson, capped at the limit", () => {
    const recs = [
      { id: "r1", title: "Newton's Laws", subject: "Physics", description: "dup of the lesson" },
      { id: "r2", title: "Practise fractions", subject: "Maths", description: "Weak area", estimatedTime: 10 },
      { id: "r3", title: "Review waves", subject: "Physics" },
      { id: "r4", title: "Extra", subject: "Physics" },
    ];
    const goals = buildDailyGoals({ lessons: [lesson()], exams: [], recommendations: recs, now });
    expect(goals).toHaveLength(3);
    expect(goals.map((g) => g.title)).toEqual(["Finish Newton's Laws", "Practise fractions", "Review waves"]);
    expect(goals[1]).toMatchObject({ actionLabel: "10 min", href: "/learn?subject=Maths&topic=Practise+fractions" });
  });
});
