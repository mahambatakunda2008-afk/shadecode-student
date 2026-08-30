import { DEFAULT_PROJECT_REQUIREMENTS, ProjectRequirements, StudentProject, ZIMBABWE_SBA_PROJECT_STAGES } from "./types";
import { getLocalRecord, putLocalRecord } from "../offline/indexedDb";
import { atomicallySaveProject, atomicallyDeleteProject } from "./localProjectRepository";
import { createProjectSnapshot } from "./recovery";
import { queueProjectDelete, queueProjectUpsert } from "./sharedSync";
import { buildProjectWorkPlan } from "./workPlanBuilder";

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

export function loadProjects(): StudentProject[] { return legacyLoad(); }

export async function loadProjectsLocalFirst(): Promise<StudentProject[]> {
  const record = await getLocalRecord(COLLECTION_ID);
  if (record?.value && Array.isArray(record.value)) return record.value as StudentProject[];
  const legacy = legacyLoad();
  if (legacy.length) await saveProjectsLocal(legacy);
  return legacy;
}

export function saveProjects(projects: StudentProject[]): void { void saveProjectsLocal(projects); }

export async function saveProjectsLocal(projects: StudentProject[]): Promise<void> {
  for (const project of projects) {
    await createProjectSnapshot(project, "autosave");
    await atomicallySaveProject(project);
    void queueProjectUpsert(project);
  }
  await putLocalRecord({ id: COLLECTION_ID, entity: ENTITY, value: projects, updatedAt: Date.now() });
}

export async function deleteProjectLocal(project: StudentProject): Promise<void> {
  await createProjectSnapshot(project, "before-delete");
  await atomicallyDeleteProject(project.id);
  const remaining = (await loadProjectsLocalFirst()).filter((item) => item.id !== project.id);
  await putLocalRecord({ id: COLLECTION_ID, entity: ENTITY, value: remaining, updatedAt: Date.now() });
  void queueProjectDelete(project.id);
}

export function createProject(input: {
  title: string;
  subject: string;
  board: string;
  academicStage: StudentProject["academicStage"];
  gradeOrForm?: string;
  brief?: string;
  dueDate?: string;
  requirements?: Partial<ProjectRequirements>;
}): StudentProject {
  const now = new Date().toISOString();
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  const requirements: ProjectRequirements = { ...DEFAULT_PROJECT_REQUIREMENTS, ...(input.requirements ?? {}) };
  const project: StudentProject = {
    id,
    title: input.title.trim() || "Untitled project",
    subject: input.subject.trim() || "General",
    board: input.board.trim() || "Not specified",
    academicStage: input.academicStage,
    gradeOrForm: input.gradeOrForm?.trim() || undefined,
    brief: input.brief?.trim() || undefined,
    requirements,
    status: "planning",
    currentStageId: ZIMBABWE_SBA_PROJECT_STAGES[0].id,
    stages: ZIMBABWE_SBA_PROJECT_STAGES,
    evidence: [],
    outline: undefined,
    createdAt: now,
    updatedAt: now,
  };
  project.workPlan = buildProjectWorkPlan(project.subject, requirements, now);
  return project;
}

/** Compatibility entry point retained for the existing Project Studio pages. */
export function buildInitialWorkPlan(project: StudentProject): StudentProject["workPlan"] {
  return buildProjectWorkPlan(project.subject, project.requirements ?? DEFAULT_PROJECT_REQUIREMENTS);
}

/** Rebuilds the production plan after a learner edits the project requirements. */
export function rebuildProjectWorkPlan(project: StudentProject): StudentProject {
  const requirements = project.requirements ?? DEFAULT_PROJECT_REQUIREMENTS;
  return {
    ...project,
    requirements,
    workPlan: buildProjectWorkPlan(project.subject, requirements),
    updatedAt: new Date().toISOString(),
  };
}
