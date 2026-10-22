import type { StoredCurriculumIdentity } from "./user-profile";

export interface HeatmapVersionIdentity {
  id: string;
  board_id: string | null;
  qualification_id: string | null;
  syllabus_id: string | null;
  syllabus_version: string | null;
  subject_id: string | null;
}

/**
 * Keep learner-facing curriculum views scoped to the exact curriculum identities
 * selected in profiles.curriculum_subjects. Never expose every verified syllabus
 * merely because it exists in the shared catalogue.
 *
 * The current curriculum_versions schema does not store level as a first-class
 * column; the other persisted identity fields are matched exactly here. Syllabus
 * identity is not inferred from a display name.
 */
export function filterHeatmapVersionsForLearner<T extends HeatmapVersionIdentity>(
  versions: T[],
  identities: StoredCurriculumIdentity[],
): T[] {
  if (!identities.length) return [];
  return versions.filter((version) => identities.some((identity) =>
    identity.boardId === version.board_id &&
    identity.qualificationId === version.qualification_id &&
    identity.syllabusId === version.syllabus_id &&
    identity.syllabusVersion === version.syllabus_version &&
    identity.subjectId === version.subject_id &&
    Boolean(identity.boardId && identity.qualificationId && identity.syllabusId &&
      identity.syllabusVersion && identity.subjectId)
  ));
}
