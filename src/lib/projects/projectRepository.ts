import { deleteLocalRecord, getLocalRecord, putLocalRecord, type LocalRecord } from "../offline/indexedDb";
import type { StudentProject } from "./types";

const ENTITY = "student-project";
const key = (projectId: string) => `${ENTITY}:${projectId}`;

export async function saveProjectLocally(project: StudentProject): Promise<void> {
  const record: LocalRecord = {
    id: key(project.id),
    entity: ENTITY,
    value: project,
    updatedAt: Date.now(),
  };
  await putLocalRecord(record);
}

export async function getProjectLocally(projectId: string): Promise<StudentProject | null> {
  const record = await getLocalRecord(key(projectId));
  return (record?.value as StudentProject | undefined) ?? null;
}

export async function deleteProjectLocally(projectId: string): Promise<void> {
  await deleteLocalRecord(key(projectId));
}
