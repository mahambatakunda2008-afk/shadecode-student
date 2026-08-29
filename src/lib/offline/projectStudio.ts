export type ProjectStage = "brief" | "question" | "methodology" | "evidence" | "analysis" | "report" | "presentation";

export type ProjectEvidence = {
  id: string;
  title: string;
  kind: "note" | "photo" | "document" | "measurement" | "observation" | "source";
  capturedAt: number;
  verified: boolean;
};

export type StudentProject = {
  id: string;
  title: string;
  subject: string;
  level?: string;
  board?: string;
  brief?: string;
  researchQuestion?: string;
  methodology?: string;
  stage: ProjectStage;
  evidence: ProjectEvidence[];
  findings?: string;
  conclusion?: string;
  createdAt: number;
  updatedAt: number;
};

export const PROJECT_STAGES: ProjectStage[] = ["brief", "question", "methodology", "evidence", "analysis", "report", "presentation"];

export function createProject(input: Pick<StudentProject, "id" | "title" | "subject"> & Partial<StudentProject>): StudentProject {
  const now = Date.now();
  return {
    id: input.id,
    title: input.title,
    subject: input.subject,
    level: input.level,
    board: input.board,
    brief: input.brief,
    researchQuestion: input.researchQuestion,
    methodology: input.methodology,
    stage: input.stage ?? "brief",
    evidence: input.evidence ?? [],
    findings: input.findings,
    conclusion: input.conclusion,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
}

export function addEvidence(project: StudentProject, evidence: ProjectEvidence): StudentProject {
  return { ...project, evidence: [...project.evidence, evidence], updatedAt: Date.now() };
}

export function advanceProject(project: StudentProject): StudentProject {
  const index = PROJECT_STAGES.indexOf(project.stage);
  const nextStage = PROJECT_STAGES[Math.min(index + 1, PROJECT_STAGES.length - 1)];
  return { ...project, stage: nextStage, updatedAt: Date.now() };
}

export function projectIntegrityWarnings(project: StudentProject): string[] {
  const warnings: string[] = [];
  if (!project.researchQuestion?.trim()) warnings.push("Define a research question before analysis.");
  if (project.stage === "analysis" && project.evidence.length === 0) warnings.push("No evidence has been recorded. Do not invent findings.");
  if (project.findings?.trim() && project.evidence.length === 0) warnings.push("Findings exist without recorded evidence. Verify them before submission.");
  return warnings;
}
