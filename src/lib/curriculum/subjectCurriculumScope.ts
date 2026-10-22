import type { StoredCurriculumIdentity } from "./user-profile";

function normalize(value: unknown): string {
  return typeof value === "string"
    ? value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "";
}

/**
 * Resolve a curriculum only from the identity attached to the selected learner
 * subject. Global profile defaults are intentionally not accepted here.
 */
export function selectExactCurriculumForSubject(
  identities: StoredCurriculumIdentity[],
  subjectId: string,
  subjectName: string,
): StoredCurriculumIdentity | null {
  const selected = identities.find((identity) =>
    normalize(identity.subjectName) === normalize(subjectName) ||
    normalize(identity.subjectId) === normalize(subjectName) ||
    normalize(identity.subjectId) === normalize(subjectId)
  );

  if (!selected?.boardId || !selected.qualificationId || !selected.level ||
      !selected.syllabusId || !selected.syllabusVersion || !selected.subjectId) {
    return null;
  }

  return selected;
}
