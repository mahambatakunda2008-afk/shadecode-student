function normalizeSubjectValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[._/]+/g, " ")
    .replace(/[-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const COMPUTER_SCIENCE_CODES = new Set(["9618", "0478", "0984", "2210", "4021"]);

function matchesComputerScience(value: unknown): boolean {
  const normalized = normalizeSubjectValue(value);
  if (!normalized) return false;

  // Subject names can arrive with the board/code before or after the name.
  // Keep this tied to recognized computing subjects rather than unlocking for
  // any arbitrary subject that happens to contain a number.
  const words = normalized.split(" ");
  const hasRecognizedCode = words.some((word) => COMPUTER_SCIENCE_CODES.has(word));
  const hasComputingName = /\b(computer science|computing science|computer studies|computing studies)\b/.test(normalized);

  return normalized === "cs" ||
    normalized === "computer science" ||
    normalized.startsWith("computer science ") ||
    normalized === "computing science" ||
    normalized === "computer studies" ||
    normalized === "computing studies" ||
    (hasRecognizedCode && hasComputingName) ||
    /^cs\s+(9618|0478|0984|2210|4021)$/.test(normalized);
}

/**
 * Code Lab is unlocked by the learner's actual computing subject metadata.
 *
 * Subject labels differ across exam boards and profile/catalog representations,
 * so recognize the common Cambridge and ZIMSEC identifiers alongside names.
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
    item.subject, item.code, item.subjectCode, item.subject_code,
    item.syllabusCode, item.syllabus_code,
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
