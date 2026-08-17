import { describe, expect, it } from "vitest";
import type { AcademicAssessment } from "@/lib/curriculum/types";
import { assessmentPressure, getOpenAssessments, isPostSecondary, normalizeCourse } from "../postSecondary";

describe("post-secondary academic helpers", () => {
  it("recognizes university and TVET pathways", () => {
    expect(isPostSecondary("university")).toBe(true);
    expect(isPostSecondary("tvet")).toBe(true);
    expect(isPostSecondary("secondary")).toBe(false);
  });

  it("normalizes course identity and defaults", () => {
    const course = normalizeCourse({ name: "  Data Structures  ", code: " CS201 " });
    expect(course.name).toBe("Data Structures");
    expect(course.code).toBe("CS201");
    expect(course.assessmentTypes).toEqual(["assignment", "test", "exam"]);
    expect(course.topics).toEqual([]);
    expect(course.id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("orders open assessments by due date", () => {
    const assessments: AcademicAssessment[] = [
      { id: "late", courseId: "CS201", title: "Exam", type: "exam", dueAt: "2026-09-10T00:00:00.000Z", completed: false },
      { id: "soon", courseId: "CS201", title: "Assignment", type: "assignment", dueAt: "2026-08-20T00:00:00.000Z", completed: false },
      { id: "done", courseId: "CS201", title: "Done", type: "test", dueAt: "2026-08-18T00:00:00.000Z", completed: true },
    ];
    const open = getOpenAssessments(assessments, new Date("2026-08-17T00:00:00.000Z"));
    expect(open.map((item) => item.id)).toEqual(["soon", "late"]);
  });

  it("weights nearer assessments more heavily", () => {
    const soon: AcademicAssessment = {
      id: "soon", courseId: "CS201", title: "Assignment", type: "assignment",
      dueAt: "2026-08-18T00:00:00.000Z", completed: false, weight: 20,
    };
    const distant: AcademicAssessment = {
      id: "distant", courseId: "CS201", title: "Assignment", type: "assignment",
      dueAt: "2026-09-17T00:00:00.000Z", completed: false, weight: 20,
    };
    expect(assessmentPressure(soon, new Date("2026-08-17T00:00:00.000Z"))).toBeGreaterThan(
      assessmentPressure(distant, new Date("2026-08-17T00:00:00.000Z")),
    );
  });
});
