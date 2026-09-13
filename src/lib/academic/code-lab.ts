function normalizeSubjectValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[._/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COMPUTER_SCIENCE_CODES = new Set(["0478", "0984", "2210", "9618", "4021"]);

function matchesComputerScience(value: unknown): boolean {
  const normalized = normalizeSubjectValue(value);
  return normalized === "cs" || normalized === "computer science" ||
    normalized.startsWith("computer science ") || normalized.startsWith("computer science-") ||
    (/^\d{4}$/.test(normalized) && COMPUTER_SCIENCE_CODES.has(normalized));
}

/** Code Lab is unlocked by the learner's actual Computer Science subject. */
export function isComputerScienceCurriculumSubject(subject: unknown): boolean {
  if (typeof subject === "string" || typeof subject === "number") return matchesComputerScience(subject);
  if (!subject || typeof subject !== "object") return false;
  if (Array.isArray(subject)) return subject.some(isComputerScienceCurriculumSubject);

  const item = subject as Record<string, unknown>;
  const directValues = [
    item.subjectId, item.subject_id, item.subjectName, item.subject_name,
    item.subjectCode, item.subject_code, item.code, item.syllabusId, item.syllabus_id,
    item.name, item.title, item.label, item.value,
  ];
  if (directValues.some(matchesComputerScience)) return true;

  return [item.subject, item.curriculum, item.catalog, item.metadata].some((nested) =>
    nested != null && isComputerScienceCurriculumSubject(nested),
  );
}

export function hasComputerScienceCurriculum(subjects: unknown): boolean {
  return Array.isArray(subjects) ? subjects.some(isComputerScienceCurriculumSubject) : isComputerScienceCurriculumSubject(subjects);
}

export function selectComputerScienceCurriculum<T>(subjects: T[]): T | null {
  return subjects.find(isComputerScienceCurriculumSubject) ?? null;
}
