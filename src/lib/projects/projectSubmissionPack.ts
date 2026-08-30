import type { StudentProject } from "./types";
import type { GeneratedProjectArtifact } from "./projectWorkerExecutor";

export type ProjectSubmissionCheck = { label: string; status: "ready" | "missing"; detail: string };
export type ProjectSubmissionPack = { title: string; checks: ProjectSubmissionCheck[]; artifacts: GeneratedProjectArtifact[]; learnerEvidenceNeeded: string[] };

export function buildProjectSubmissionPack(project: StudentProject, artifacts: GeneratedProjectArtifact[] = []): ProjectSubmissionPack {
  const r = project.requirements;
  const checks: ProjectSubmissionCheck[] = [
    { label: "Teacher brief", status: project.brief?.trim() ? "ready" : "missing", detail: project.brief?.trim() ? "Captured" : "Add the original assignment brief." },
    { label: "Final deliverable", status: r?.deliverable?.trim() ? "ready" : "missing", detail: r?.deliverable?.trim() || "Specify what must be submitted." },
    { label: "Rubric / marking scheme", status: r?.teacherRubric?.trim() ? "ready" : "missing", detail: r?.teacherRubric?.trim() ? "Captured" : "Add the rubric if one was provided." },
  ];
  const learnerEvidenceNeeded = [
    ...(r?.physicalWork?.trim() ? ["Complete and document the physical work described in the brief."] : []),
    ...((project.workPlan?.requiredEvidence ?? []).filter(Boolean)),
  ];
  checks.push({ label: "Learner evidence", status: learnerEvidenceNeeded.length ? "missing" : "ready", detail: learnerEvidenceNeeded.length ? "Real-world evidence still needs learner confirmation." : "No explicit physical evidence requirement detected." });
  return { title: `${project.title || "Project"} submission pack`, checks, artifacts, learnerEvidenceNeeded: [...new Set(learnerEvidenceNeeded)] };
}
