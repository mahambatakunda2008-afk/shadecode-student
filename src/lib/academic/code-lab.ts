export function isComputerScienceCurriculumSubject(subject: unknown): boolean {
  if (!subject || typeof subject !== "object" || Array.isArray(subject)) return false;
  const item = subject as Record<string, unknown>;
  const values = [
    item.subjectId,
    item.subject_id,
    item.subjectName,
    item.subject_name,
    item.subjectCode,
    item.subject_code,
    item.code,
    item.syllabusId,
    item.syllabus_id,
  ].map((value) => String(value ?? "").trim().toLowerCase());

  return values.some((value) =>
    value === "computer-science" ||
    value === "computer_science" ||
    value === "computer science" ||
    value === "cs" ||
    value.startsWith("computer-science-") ||
    value.startsWith("computer science ") ||
    /^\d{4}$/.test(value) && ["0478", "0984", "2210", "9618", "4021"].includes(value),
  );
}

export function hasComputerScienceCurriculum(subjects: unknown): boolean {
  return Array.isArray(subjects) && subjects.some(isComputerScienceCurriculumSubject);
}

export function selectComputerScienceCurriculum<T>(subjects: T[]): T | null {
  return subjects.find(isComputerScienceCurriculumSubject) ?? null;
}
