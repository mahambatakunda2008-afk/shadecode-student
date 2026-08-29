import type { StudentProject } from "./types";

export type ProjectIntegrityFlag = {
  code: "missing-evidence" | "unsupported-finding" | "missing-methodology" | "incomplete-evaluation";
  severity: "info" | "warning" | "blocking";
  message: string;
};

export function inspectProjectIntegrity(project: StudentProject): ProjectIntegrityFlag[] {
  const flags: ProjectIntegrityFlag[] = [];
  if (!project.brief?.trim()) flags.push({ code: "missing-methodology", severity: "warning", message: "Add a clear project brief before relying on generated guidance." });
  const investigation = project.stages.find((stage) => stage.id === "investigation");
  const investigationEvidence = project.evidence.filter((item) => item.stageId === investigation?.id);
  if (investigation && investigationEvidence.length === 0) {
    flags.push({ code: "missing-evidence", severity: "warning", message: "No investigation evidence has been recorded yet. Do not invent observations, interviews, measurements, or sources." });
  }
  const hasDevelopEvidence = project.evidence.some((item) => item.stageId === "develop");
  const hasEvaluationEvidence = project.evidence.some((item) => item.stageId === "evaluate");
  if (project.status === "review" && !hasDevelopEvidence) flags.push({ code: "unsupported-finding", severity: "blocking", message: "Record real development/testing evidence before treating the project outcome as established." });
  if (project.status === "completed" && !hasEvaluationEvidence) flags.push({ code: "incomplete-evaluation", severity: "warning", message: "Complete the evaluation and reflection stage before final submission." });
  return flags;
}
