function normalizeSubjectValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[._/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesComputerScience(value: unknown): boolean {
  const normalized = normalizeSubjectValue(value);
  return normalized === "cs" ||
    normalized === "computer science" ||
    normalized.startsWith("computer science ") ||
    normalized.startsWith("computer science-") ||
    normalized === "computing science" ||
    normalized === "computer studies" ||
    normalized === "computing studies";
}

/**
 * Code Lab is unlocked by the learner's actual computing subject metadata.
 *
 * Deliberately does not hard-code examination-board subject codes. Boards can
 * reuse, change, or assign different numeric codes, while the canonical
 * subject identity remains the source of truth.
 */
export function isComputerScienceCurriculumSubject(subject: unknown): boolean {
  if (typeof subject === "string" || typeof subject === "number") return matchesComputerScience(subject);
  if (!subject || typeof subject !== "object") return false;
  if (Array.isArray(subject)) return subject.some(isComputerScienceCurriculumSubject);

  const item = subject as Record<string, unknown>;
  const directValues = [
    item.subjectName, item.subject_name,
    item.subjectTitle, item.subject_title,
    item.subjectLabel, item.subject_label,
    item.name, item.title, item.label,
    item.subject,
  ];
  if (directValues.some(matchesComputerScience)) return true;

  return [item.curriculum, item.catalog, item.metadata, item.subjectMetadata].some((nested) =>
    nested != null && isComputerScienceCurriculumSubject(nested),
  );
}

export function hasComputerScienceCurriculum(subjects: unknown): boolean {
  return Array.isArray(subjects)
    ? subjects.some(isComputerScienceCurriculumSubject)
    : isComputerScienceCurriculumSubject(subjects);
}

export function selectComputerScienceCurriculum<T>(subjects: T[]): T | null {
  return subjects.find(isComputerScienceCurriculumSubject) ?? null;
}
