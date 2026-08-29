import { ProjectAcademicStage, ProjectStage, ZIMBABWE_SBA_PROJECT_STAGES } from "./types";

export type ProjectTemplate = {
  id: string;
  board: string;
  title: string;
  academicStage: ProjectAcademicStage;
  description: string;
  stages: ProjectStage[];
  sourceStatus: "curriculum-aligned" | "generic";
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "zw-sba-general",
    board: "ZIMSEC",
    title: "Zimbabwe School-Based Project",
    academicStage: "foundation",
    description: "A flexible staged project workspace for Zimbabwean school learners. Teacher instructions remain the source of truth for the exact assignment.",
    stages: ZIMBABWE_SBA_PROJECT_STAGES,
    sourceStatus: "curriculum-aligned",
  },
  {
    id: "generic-project",
    board: "Not specified",
    title: "General Project",
    academicStage: "secondary",
    description: "A board-neutral project workflow for learners whose exact project requirements have not yet been supplied.",
    stages: ZIMBABWE_SBA_PROJECT_STAGES,
    sourceStatus: "generic",
  },
];

export function findProjectTemplate(board?: string, academicStage?: ProjectAcademicStage): ProjectTemplate {
  const normalized = board?.trim().toLowerCase();
  const match = PROJECT_TEMPLATES.find((template) => normalized && template.board.toLowerCase() === normalized && (!academicStage || template.academicStage === academicStage));
  return match ?? PROJECT_TEMPLATES.find((template) => template.id === "generic-project")!;
}
