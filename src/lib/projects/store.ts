import { StudentProject, ZIMBABWE_SBA_PROJECT_STAGES } from "./types";
import { getLocalRecord, putLocalRecord } from "../offline/indexedDb";

const STORAGE_KEY = "shadecode-project-studio-v1";
const ENTITY = "student-project";
const COLLECTION_ID = `${ENTITY}:collection`;

function legacyLoad(): StudentProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function loadProjects(): StudentProject[] {
  return legacyLoad();
}

export async function loadProjectsLocalFirst(): Promise<StudentProject[]> {
  const record = await getLocalRecord(COLLECTION_ID);
  if (record?.value && Array.isArray(record.value)) return record.value as StudentProject[];
  const legacy = legacyLoad();
  if (legacy.length) await saveProjectsLocal(legacy);
  return legacy;
}

export function saveProjects(projects: StudentProject[]): void {
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); } catch { /* legacy fallback only */ }
  }
  void saveProjectsLocal(projects);
}

export async function saveProjectsLocal(projects: StudentProject[]): Promise<void> {
  await putLocalRecord({ id: COLLECTION_ID, entity: ENTITY, value: projects, updatedAt: Date.now() });
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
