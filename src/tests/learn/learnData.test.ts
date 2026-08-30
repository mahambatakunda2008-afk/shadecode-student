import { describe, expect, it } from "vitest";

type Difficulty = "easy" | "medium" | "hard";
type Lesson = { id: string; subjectId: string; subject: string; title: string; description?: string; difficulty: Difficulty; progress: number; completed: boolean };
type Subject = { id: string; name: string; lessonCount: number };

function clampProgress(v: number | null): number { return typeof v === "number" && Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : 0; }
function buildSubjectTabs(subjects: Subject[], lessons: Array<{ subject_id: string }>): Subject[] { const counts = lessons.reduce<Record<string, number>>((acc, l) => { acc[l.subject_id] = (acc[l.subject_id] ?? 0) + 1; return acc; }, {}); return subjects.map(s => ({ ...s, lessonCount: counts[s.id] ?? 0 })); }

function toLesson(row: { id: string; subject_id: string; title: string; progress: number | null; difficulty: string | null }, subjectById: Map<string,string>): Lesson { const progress = clampProgress(row.progress); return { id: row.id, subjectId: row.subject_id, subject: subjectById.get(row.subject_id) ?? "Unknown subject", title: row.title, difficulty: row.difficulty === "medium" || row.difficulty === "hard" ? row.difficulty : "easy", progress, completed: progress >= 100 }; }

describe("Learn response shaping", () => {
  it("clamps progress and derives completion", () => {
    expect(toLesson({ id: "1", subject_id: "s", title: "T", progress: 140, difficulty: "medium" }, new Map([["s", "Physics"]]))).toMatchObject({ progress: 100, completed: true, subject: "Physics" });
    expect(toLesson({ id: "2", subject_id: "s", title: "T", progress: -4, difficulty: "bad" }, new Map([["s", "Physics"]]))).toMatchObject({ progress: 0, completed: false, difficulty: "easy" });
  });

  it("counts lessons per subject without leaking another subject's count", () => {
    const result = buildSubjectTabs([{ id: "a", name: "Math", lessonCount: 0 }, { id: "b", name: "Physics", lessonCount: 0 }], [{ subject_id: "a" }, { subject_id: "a" }, { subject_id: "b" }]);
    expect(result).toEqual([{ id: "a", name: "Math", lessonCount: 2 }, { id: "b", name: "Physics", lessonCount: 1 }]);
  });
});
