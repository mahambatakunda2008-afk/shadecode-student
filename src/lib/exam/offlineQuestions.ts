import type { GeneratedExam } from "@/lib/cortex/examGenerator";

/**
 * Convert a generated question to the workspace's numeric-ID format without
 * dropping optional capabilities such as structured tables, graphs or diagrams.
 */
export function mapOfflineExamQuestions(
  questions: GeneratedExam["questions"],
): Array<Omit<GeneratedExam["questions"][number], "id"> & { id: number }> {
  return questions.map((question, index) => ({
    ...question,
    id: index + 1,
  }));
}
