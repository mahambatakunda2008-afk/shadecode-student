import type { ExamResults } from "@/types/exam";
import type { LearningEvidence } from "./evidence";

export function evidenceFromExamResult(
  result: ExamResults,
  subject: string,
  topic?: string,
  workId = `exam:${Date.now()}`,
): LearningEvidence {
  const percentage = Math.max(0, Math.min(100, Number(result.percentage) || 0));
  const weakAreas = Array.isArray(result.weakAreas) ? result.weakAreas : [];
  const strongAreas = Array.isArray(result.strongAreas) ? result.strongAreas : [];

  return {
    id: `${workId}:marked`,
    workId,
    source: "exam",
    subject: subject.trim() || undefined,
    topic: topic?.trim() || undefined,
    outcome: percentage >= 85 ? "mastered" : percentage < 50 ? "struggled" : "marked",
    score: result.totalScore,
    percentage,
    timeSpentMs: Math.max(0, Number(result.timeTaken) || 0) * 1000,
    hintsUsed: 0,
    weakAreas: weakAreas.filter((value): value is string => typeof value === "string").slice(0, 20),
    strongAreas: strongAreas.filter((value): value is string => typeof value === "string").slice(0, 20),
    createdAt: new Date().toISOString(),
  };
}
