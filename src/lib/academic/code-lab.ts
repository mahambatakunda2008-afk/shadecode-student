function normalizeSubjectValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[._/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Code Lab is unlocked by the learner's actual Computer Science subject.
 * Subject data can be represented as strings or curriculum/profile objects.
 * Curriculum codes remain catalog metadata, not learner-facing inputs.
 */
export function isComputerScienceCurriculumSubject(subject: unknown): boolean {
  if (typeof subject === "string" || typeof subject === "number") {
    const value = normalizeSubjectValue(subject);
    return value === "cs" || value === "computer science" ||
      (/^\d{4}$/.test(value) && ["0478", "0984", "2210", "9618", "4021"].includes(value));
  }

  if (!subject || typeof subject !== "object" || Array.isArray(subject)) return false;
  const item = subject as Record<string, unknown>;
  const values = [
    item.subjectId, item.subject_id, item.subjectName, item.subject_name,
    item.subjectCode, item.subject_code, item.code, item.syllabusId, item.syllabus_id,
    item.name, item.title, item.label, item.value,
  ].map(normalizeSubjectValue);

  return values.some((value) =>
    value === "computer science" || value === "cs" ||
    value.startsWith("computer science ") || value.startsWith("computer science-") ||
    (/^\d{4}$/.test(value) && ["0478", "0984", "2210", "9618", "4021"].includes(value)),
  );
}

export function hasComputerScienceCurriculum(subjects: unknown): boolean {
  return Array.isArray(subjects) && subjects.some(isComputerScienceCurriculumSubject);
}

export function selectComputerScienceCurriculum<T>(subjects: T[]): T | null {
  return subjects.find(isComputerScienceCurriculumSubject) ?? null;
}
