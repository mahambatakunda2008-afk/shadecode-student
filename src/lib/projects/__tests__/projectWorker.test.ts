import { describe, expect, it } from "vitest";
import { buildProjectWorkerPlan } from "@/lib/projects/projectWorker";
import type { StudentProject } from "@/lib/projects/types";

function project(overrides: Partial<StudentProject> = {}): StudentProject {
  return {
    id: "p1",
    title: "Science project",
    subject: "Physics",
    board: "ZIMSEC",
    academicStage: "secondary",
    brief: "Investigate motion",
    requirements: {
      deliverable: "Report",
      requiredSections: "Method, Results, Conclusion",
      teacherRubric: "Accuracy",
      constraints: "",
      materials: "",
      physicalWork: "",
      digitalWork: "",
      preferredFormat: "report",
      assistanceLevel: "build_with_me",
    },
    workPlan: {
      generatedAt: new Date().toISOString(),
      summary: "",
      digitalTasks: [],
      physicalTasks: [],
      requiredEvidence: [],
      deliverables: [],
    },
    status: "planning",
    currentStageId: "problem",
    stages: [],
    evidence: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("project worker planning", () => {
  it("surfaces evidence blockers even when no teacher rubric is supplied", () => {
    const plan = buildProjectWorkerPlan(project({
      requirements: {
        ...project().requirements!,
        teacherRubric: "",
      },
      workPlan: {
        ...project().workPlan!,
        requiredEvidence: ["Record the measurement results"],
      },
    }));

    expect(plan.blockers).toContain("Real evidence still required: Record the measurement results");
  });

  it("keeps evidence-dependent worker tasks blocked", () => {
    const plan = buildProjectWorkerPlan(project({
      subject: "Physics",
      requirements: {
        ...project().requirements!,
        deliverable: "Experimental report",
        physicalWork: "Measure the oscillation period",
      },
    }));

    expect(plan.tasks.some((task) => task.kind === "calculations" && task.status === "blocked")).toBe(true);
  });
});
