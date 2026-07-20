/**
 * /lib/student-intelligence/services/weakAreas.ts
 *
 * Shared weak-area computation. Extracted from intelligence.ts so both
 * intelligence.ts (dashboard display) and intelligence-integration.ts
 * (recommendation engine input) compute this the same way instead of
 * each maintaining their own copy -- intelligence.ts already imports
 * from intelligence-integration.ts, so a direct import the other way
 * would be circular.
 */

import { getMemory } from "@/lib/cortex/memory";
import { performanceService } from "./performance";

export interface WeakAreaResult {
  topicId: string;
  topic: string;
  subject: string;
  severity: "low" | "medium" | "high" | "critical";
  score: number;
  lastAssessed: string;
  recommendedActions: string[];
  estimatedTimeToImprove: number;
}

/**
 * Build the weak-areas list for a user, using real per-subject exam
 * performance to compute an actual score instead of a hardcoded 0.
 */
export async function computeWeakAreas(userId: string): Promise<WeakAreaResult[]> {
  const cortexMemory = await getMemory(userId);
  const weakAreas: WeakAreaResult[] = [];

  if (!cortexMemory.weakTopics || cortexMemory.weakTopics.length === 0) {
    return weakAreas;
  }

  const exams = await performanceService.getExamPerformance(userId);
  const subjectAverages = new Map<string, number>();
  exams.forEach((exam) => {
    const key = exam.subject.toLowerCase();
    const existing = subjectAverages.get(key);
    subjectAverages.set(key, existing !== undefined ? (existing + exam.percentage) / 2 : exam.percentage);
  });

  const overallAverage = exams.length > 0
    ? Math.round(exams.reduce((s, e) => s + e.percentage, 0) / exams.length)
    : 0;

  cortexMemory.weakTopics.forEach((topic, index) => {
    // Best-effort subject match: the exam's subject field is the full
    // subject name (e.g. "Mathematics"), while a weak topic string might
    // be a specific concept within it (e.g. "Mathematics: Quadratic
    // Equations") -- match on substring in either direction rather than
    // requiring an exact match.
    const matchedSubject = [...subjectAverages.keys()].find(
      (subj) => topic.toLowerCase().includes(subj) || subj.includes(topic.toLowerCase())
    );
    const matchedExam = matchedSubject ? exams.find((e) => e.subject.toLowerCase() === matchedSubject) : undefined;

    weakAreas.push({
      topicId: crypto.randomUUID(),
      topic,
      subject: matchedExam?.subject ?? "General",
      severity: index < 2 ? "critical" : index < 4 ? "high" : "medium",
      // 0 would misleadingly read as "you're scoring zero on this topic"
      // -- when there's no matching exam data, fall back to the overall
      // average (still real, not fabricated) rather than a fake floor.
      score: matchedSubject ? Math.round(subjectAverages.get(matchedSubject)!) : overallAverage,
      lastAssessed: new Date().toISOString(),
      recommendedActions: [
        "Review fundamentals",
        "Practice exercises",
        "Take quiz",
      ],
      estimatedTimeToImprove: 60,
    });
  });

  return weakAreas;
}
