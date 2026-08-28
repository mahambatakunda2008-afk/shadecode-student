import { StudentProject, ZIMBABWE_SBA_PROJECT_STAGES } from "./types";

const STORAGE_KEY = "shadecode-project-studio-v1";

export function loadProjects(): StudentProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProjects(projects: StudentProject[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Storage can be unavailable or full. The UI remains usable for the current session.
  }
}

export function createProject(input: {
  title: string;
  subject: string;
  board: string;
  academicStage: StudentProject["academicStage"];
  gradeOrForm?: string;
  brief?: string;
  dueDate?: string;
}): StudentProject {
  const now = new Date().toISOString();
  return {
    id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title.trim() || "Untitled project",
    subject: input.subject.trim() || "General",
    board: input.board.trim() || "Not specified",
    academicStage: input.academicStage,
    gradeOrForm: input.gradeOrForm?.trim() || undefined,
    brief: input.brief?.trim() || undefined,
    dueDate: input.dueDate || undefined,
    status: "planning",
    currentStageId: ZIMBABWE_SBA_PROJECT_STAGES[0].id,
    stages: ZIMBABWE_SBA_PROJECT_STAGES,
    evidence: [],
    createdAt: now,
    updatedAt: now,
  };
}
