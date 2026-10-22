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

/**
 * Match an explicit subject request to a selected curriculum identity. When a
 * subject is supplied, callers must not silently fall back to the only other
 * configured subject.
 */
export function selectCurriculumIdentityForRequestedSubject(
  identities: StoredCurriculumIdentity[],
  requestedSubject: string,
): StoredCurriculumIdentity | null {
  const requested = normalize(requestedSubject);
  if (!requested) return null;

  return identities.find((identity) =>
    normalize(identity.subjectName) === requested ||
    normalize(identity.subjectId) === requested
  ) ?? null;
}
